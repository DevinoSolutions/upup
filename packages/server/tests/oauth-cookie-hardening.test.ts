// packages/server/tests/oauth-cookie-hardening.test.ts
//
// T-5698 (review of #613): hardening the OAuth nonce cookie.
//  - on https the cookie is `__Host-upup_oauth_<provider>` (Path=/, Secure, no
//    Domain), so a sibling subdomain cannot toss a cookie of the same name at
//    the callback; plain http (local dev / e2e) keeps the unprefixed name and
//    the /cb path because `__Host-` requires Secure.
//  - /cb reads the name that matches the request scheme only.
//  - every /cb exit after the provider is known clears the nonce cookie, not
//    just success.
//  - with duplicate cookie names, ANY candidate matching the state's hash wins;
//    the first one in the header cannot shadow the real one.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import { InMemoryTokenStore, getTokens } from '../src/tokenStore'
import type { UpupServerConfig } from '../src/config'

const configFor = (tokenStore: InMemoryTokenStore): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'cookie-hardening-secret-0123456789',
    tokenStore,
    allowAnonymous: true,
    providers: {
        googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
    },
})

const HTTPS = 'https://srv.example'
const HTTP = 'http://localhost'

async function startFlow(
    handler: (req: Request) => Promise<Response>,
    origin: string,
) {
    const res = await handler(
        new Request(`${origin}/auth/google-drive`, { method: 'GET' }),
    )
    const setCookie = res.headers.get('Set-Cookie') as string
    const [name, nonce] = setCookie.split(';')[0]!.split('=') as [
        string,
        string,
    ]
    const state = new URL(
        res.headers.get('Location') as string,
    ).searchParams.get('state') as string
    return { setCookie, name, nonce, state }
}

const cb = (origin: string, state: string, cookie?: string, extra = '') =>
    new Request(
        `${origin}/auth/google-drive/cb?code=xyz&state=${state}${extra}`,
        {
            method: 'GET',
            ...(cookie ? { headers: { Cookie: cookie } } : {}),
        },
    )

describe('nonce cookie name and attributes follow the scheme (T-5698)', () => {
    it('https: __Host- prefix, Path=/, Secure, HttpOnly, SameSite=Lax, Max-Age=600, no Domain', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const { setCookie } = await startFlow(handler, HTTPS)
        expect(setCookie).toMatch(
            /^__Host-upup_oauth_google-drive=[0-9a-f]{64};/,
        )
        expect(setCookie).toContain('Path=/;')
        expect(setCookie).not.toMatch(/Path=\/auth/)
        expect(setCookie).toContain('Secure')
        expect(setCookie).toContain('HttpOnly')
        expect(setCookie).toContain('SameSite=Lax')
        expect(setCookie).toContain('Max-Age=600')
        expect(setCookie.toLowerCase()).not.toContain('domain=')
    })

    it('https under a prefix mount is still Path=/ (a __Host- cookie may not carry another path)', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const res = await handler(
            new Request(`${HTTPS}/api/upup/auth/google-drive`),
        )
        const setCookie = res.headers.get('Set-Cookie') as string
        expect(setCookie).toMatch(/^__Host-upup_oauth_google-drive=/)
        expect(setCookie).toContain('Path=/;')
    })

    it('http: the unprefixed name and the /cb path are kept, no Secure', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const { setCookie } = await startFlow(handler, HTTP)
        expect(setCookie).toMatch(/^upup_oauth_google-drive=[0-9a-f]{64};/)
        expect(setCookie).toContain('Path=/auth/google-drive/cb')
        expect(setCookie).not.toContain('Secure')
    })
})

describe('/cb reads the cookie name that matches the request scheme (T-5698)', () => {
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

    it('https: completes with the __Host- cookie', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { name, nonce, state } = await startFlow(handler, HTTPS)
        const res = await handler(cb(HTTPS, state, `${name}=${nonce}`))
        expect(res.status).toBe(200)
        expect(
            (await getTokens(store, 'default', 'google-drive'))?.accessToken,
        ).toBe('AT')
    })

    it('https: a tossed UNPREFIXED cookie with the right value is ignored (403)', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { nonce, state } = await startFlow(handler, HTTPS)
        const res = await handler(
            cb(HTTPS, state, `upup_oauth_google-drive=${nonce}`),
        )
        expect(res.status).toBe(403)
        expect(await getTokens(store, 'default', 'google-drive')).toBeNull()
    })

    it('http: a __Host- cookie is not what /cb reads (403); the unprefixed one is', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { name, nonce, state } = await startFlow(handler, HTTP)
        const wrong = await handler(
            cb(HTTP, state, `__Host-upup_oauth_google-drive=${nonce}`),
        )
        expect(wrong.status).toBe(403)
        // state is single-use: a fresh flow for the positive case
        const again = await startFlow(handler, HTTP)
        const ok = await handler(
            cb(HTTP, again.state, `${again.name}=${again.nonce}`),
        )
        expect(ok.status).toBe(200)
        expect(name).toBe('upup_oauth_google-drive')
    })
})

describe('duplicate cookie names (T-5698)', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>
    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ access_token: 'AT' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        )
    })
    afterEach(() => {
        fetchSpy.mockRestore()
    })

    it('accepts when the REAL cookie comes after a tossed one of the same name', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { name, nonce, state } = await startFlow(handler, HTTP)
        const res = await handler(
            cb(HTTP, state, `${name}=${'0'.repeat(64)}; ${name}=${nonce}`),
        )
        expect(res.status).toBe(200)
        expect(
            (await getTokens(store, 'default', 'google-drive'))?.accessToken,
        ).toBe('AT')
    })

    it('accepts when the real cookie comes first', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const { name, nonce, state } = await startFlow(handler, HTTP)
        const res = await handler(
            cb(HTTP, state, `${name}=${nonce}; ${name}=${'0'.repeat(64)}`),
        )
        expect(res.status).toBe(200)
    })

    it('still 403s when NO duplicate matches', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const { name, state } = await startFlow(handler, HTTP)
        const res = await handler(
            cb(
                HTTP,
                state,
                `${name}=${'0'.repeat(64)}; ${name}=${'1'.repeat(64)}`,
            ),
        )
        expect(res.status).toBe(403)
        expect(await getTokens(store, 'default', 'google-drive')).toBeNull()
    })
})

describe('the nonce cookie is cleared on every /cb exit that carried a real pending state (T-5698)', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>
    afterEach(() => {
        fetchSpy?.mockRestore()
    })

    const expectCleared = (res: Response, origin: string) => {
        const cleared = res.headers.get('Set-Cookie') as string
        expect(cleared).toBeTruthy()
        const secure = origin.startsWith('https')
        expect(cleared).toMatch(
            new RegExp(`^${secure ? '__Host-' : ''}upup_oauth_google-drive=;`),
        )
        expect(cleared).toContain('Max-Age=0')
        expect(cleared).toContain(
            secure ? 'Path=/;' : 'Path=/auth/google-drive/cb',
        )
        expect(cleared).toContain('HttpOnly')
    }

    for (const origin of [HTTP, HTTPS]) {
        it(`${origin}: 403 session mismatch clears it`, async () => {
            const handler = createUpupHandler(
                configFor(new InMemoryTokenStore()),
            )
            const { name, state } = await startFlow(handler, origin)
            const res = await handler(
                cb(origin, state, `${name}=${'0'.repeat(64)}`),
            )
            expect(res.status).toBe(403)
            expectCleared(res, origin)
        })

        it(`${origin}: 424 token exchange failure clears it`, async () => {
            fetchSpy = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValue(new Response('nope', { status: 400 }))
            const handler = createUpupHandler(
                configFor(new InMemoryTokenStore()),
            )
            const { name, nonce, state } = await startFlow(handler, origin)
            const res = await handler(cb(origin, state, `${name}=${nonce}`))
            expect(res.status).toBe(424)
            expectCleared(res, origin)
        })

        // A /cb with no resolvable state proves nothing about THIS browser's
        // flow, so it must not touch the cookie: a cross-site navigation to
        // /auth/<p>/cb would otherwise wipe a victim's in-flight login.
        it(`${origin}: an unknown or missing state does NOT clear it`, async () => {
            const handler = createUpupHandler(
                configFor(new InMemoryTokenStore()),
            )
            const unknown = await handler(cb(origin, 'not-a-real-state'))
            expect(unknown.status).toBe(400)
            expect(unknown.headers.get('Set-Cookie')).toBeNull()
            const denied = await handler(
                new Request(
                    `${origin}/auth/google-drive/cb?error=access_denied`,
                ),
            )
            expect(denied.status).toBe(400)
            expect(denied.headers.get('Set-Cookie')).toBeNull()
            const missing = await handler(
                new Request(`${origin}/auth/google-drive/cb`),
            )
            expect(missing.status).toBe(400)
            expect(missing.headers.get('Set-Cookie')).toBeNull()
        })

        it(`${origin}: a state belonging to ANOTHER provider does NOT clear it`, async () => {
            const handler = createUpupHandler(
                configFor(new InMemoryTokenStore()),
            )
            const { state } = await startFlow(handler, origin)
            const res = await handler(
                new Request(`${origin}/auth/dropbox/cb?code=x&state=${state}`),
            )
            expect(res.status).toBe(400)
            expect(res.headers.get('Set-Cookie')).toBeNull()
        })
    }

    it('an unknown provider name sets no cookie (the name is attacker-chosen)', async () => {
        const handler = createUpupHandler(configFor(new InMemoryTokenStore()))
        const res = await handler(
            new Request(`${HTTPS}/auth/evil-one/cb?code=x&state=y`),
        )
        expect(res.headers.get('Set-Cookie')).toBeNull()
    })
})
