// packages/server/tests/oauth-callback-binding.test.ts
//
// T-5463: the OAuth callback must be bound to the browser that started the
// flow. /auth/:provider sets an HttpOnly nonce cookie and stores its sha256 in
// the OAuth state; /auth/:provider/cb only completes when the request carries
// the matching cookie. Without it an attacker could start a flow, hand the
// provider URL to a victim, and have the victim's Drive tokens saved under the
// attacker's userId.
import { createHash } from 'node:crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    saveOAuthState,
    consumeOAuthState,
} from '../src/tokenStore'
import type { UpupServerConfig } from '../src/config'

const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex')

const configFor = (tokenStore: InMemoryTokenStore): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'binding-test-secret-0123456789',
    tokenStore,
    allowAnonymous: true,
    providers: {
        googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
        dropbox: { appKey: 'dkey', appSecret: 'dsec' },
    },
})

/** Pull `name=value` out of a Set-Cookie header. */
function cookiePair(setCookie: string): string {
    return setCookie.split(';')[0]!
}

async function startFlow(
    handler: (req: Request) => Promise<Response>,
    url: string,
) {
    const res = await handler(new Request(url, { method: 'GET' }))
    const setCookie = res.headers.get('Set-Cookie')
    const state = new URL(
        res.headers.get('Location') as string,
    ).searchParams.get('state') as string
    return { res, setCookie, state }
}

describe('OAuth redirect sets the nonce cookie', () => {
    it('sets an HttpOnly, SameSite=Lax, 10-minute cookie scoped to the /cb path', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { res, setCookie } = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        expect(res.status).toBe(302)
        expect(setCookie).toMatch(/^upup_oauth_google-drive=[0-9a-f]{64};/)
        expect(setCookie).toContain('Path=/auth/google-drive/cb')
        expect(setCookie).toContain('Max-Age=600')
        expect(setCookie).toContain('HttpOnly')
        expect(setCookie).toContain('SameSite=Lax')
    })

    it('scopes the cookie Path under a prefix mount', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const { setCookie } = await startFlow(
            handler,
            'http://localhost/api/upup/auth/dropbox',
        )
        expect(setCookie).toMatch(/^upup_oauth_dropbox=/)
        expect(setCookie).toContain('Path=/api/upup/auth/dropbox/cb')
    })

    it('adds Secure only when the callback URL is https', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const http = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        const https = await startFlow(
            handler,
            'https://srv.example/auth/google-drive',
        )
        expect(http.setCookie).not.toContain('Secure')
        expect(https.setCookie).toContain('Secure')
    })

    it('stores only the sha256 of the nonce in the state, never the nonce', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { setCookie, state } = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        const nonce = cookiePair(setCookie as string).split('=')[1]!
        const saved = await consumeOAuthState(store, state)
        expect(saved?.nonceHash).toBe(sha256Hex(nonce))
        expect(JSON.stringify(saved)).not.toContain(nonce)
        expect(nonce).not.toBe(state)
    })
})

describe('OAuth callback is bound to the initiating browser', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({ access_token: 'AT', expires_in: 3600 }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        )
    })

    afterEach(() => {
        fetchSpy.mockRestore()
    })

    const cb = (state: string, cookie?: string) =>
        new Request(
            `http://localhost/auth/google-drive/cb?code=xyz&state=${state}`,
            {
                method: 'GET',
                ...(cookie ? { headers: { Cookie: cookie } } : {}),
            },
        )

    it('403 AUTH_DENIED when the callback carries no cookie, and writes no tokens', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { state } = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        const res = await handler(cb(state))
        expect(res.status).toBe(403)
        const body = (await res.json()) as { code?: string }
        expect(body.code).toBe('AUTH_DENIED')
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
        expect(await getTokens(store, 'default', 'google-drive')).toBeNull()
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('403 when the cookie value is wrong, and writes no tokens', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { state } = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        const res = await handler(
            cb(state, `upup_oauth_google-drive=${'0'.repeat(64)}`),
        )
        expect(res.status).toBe(403)
        expect(await getTokens(store, 'default', 'google-drive')).toBeNull()
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("403 when only another provider's nonce cookie is present", async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const g = await startFlow(handler, 'http://localhost/auth/google-drive')
        const d = await startFlow(handler, 'http://localhost/auth/dropbox')
        const res = await handler(
            cb(g.state, cookiePair(d.setCookie as string)),
        )
        expect(res.status).toBe(403)
        expect(await getTokens(store, 'default', 'google-drive')).toBeNull()
    })

    it('fails closed (403) for a state saved without a nonceHash, even with a cookie', async () => {
        const store = new InMemoryTokenStore()
        await saveOAuthState(store, 'legacy-state', {
            userId: 'attacker',
            provider: 'google-drive',
        })
        const handler = createUpupHandler(configFor(store))
        const res = await handler(
            cb('legacy-state', 'upup_oauth_google-drive=anything'),
        )
        expect(res.status).toBe(403)
        expect(await getTokens(store, 'attacker', 'google-drive')).toBeNull()
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('a victim replaying the attacker URL without the attacker cookie gets nothing saved', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler({
            ...configFor(store),
            getUserId: async () => 'attacker',
        })
        // Attacker starts the flow (their browser holds the cookie), then gives
        // the provider URL to the victim, whose browser finishes it.
        const { state } = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        const res = await handler(cb(state))
        expect(res.status).toBe(403)
        expect(await getTokens(store, 'attacker', 'google-drive')).toBeNull()
    })

    it('burns the state on a mismatch, so a later correct cookie cannot resurrect it', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { setCookie, state } = await startFlow(
            handler,
            'http://localhost/auth/google-drive',
        )
        expect((await handler(cb(state))).status).toBe(403)
        const retry = await handler(cb(state, cookiePair(setCookie as string)))
        expect(retry.status).toBe(400)
    })

    it('completes with the matching cookie, finds it among other cookies, and clears it', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { setCookie, state } = await startFlow(
            handler,
            'http://localhost/api/upup/auth/google-drive',
        )
        const res = await handler(
            new Request(
                `http://localhost/api/upup/auth/google-drive/cb?code=xyz&state=${state}`,
                {
                    method: 'GET',
                    headers: {
                        Cookie: `a=b; ${cookiePair(setCookie as string)}; c=d`,
                    },
                },
            ),
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('text/html')
        expect(
            (await getTokens(store, 'default', 'google-drive'))?.accessToken,
        ).toBe('AT')
        const cleared = res.headers.get('Set-Cookie') as string
        expect(cleared).toMatch(/^upup_oauth_google-drive=;/)
        expect(cleared).toContain('Max-Age=0')
        expect(cleared).toContain('Path=/api/upup/auth/google-drive/cb')
        expect(cleared).toContain('HttpOnly')
    })
})
