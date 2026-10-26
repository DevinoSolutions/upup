// packages/server/tests/oauth-upstream-failure-status.test.ts
//
// T-6087: a failed OAuth token exchange used to answer 502. Cloudflare replaces
// ANY origin 502/504 with its own text/plain "error code: 502" page, so on a
// proxied deployment (dev.useupup.com) the JSON body, the AUTH_PROVIDER_ERROR
// code and the x-upup-request-id never reached the client and a provider
// misconfiguration looked like a Cloudflare outage. The route now answers with
// a status Cloudflare passes through (424), keeping the whole uniform
// `{ error, code }` body, the request id and the cleared nonce cookie.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import { UPSTREAM_FAILURE_STATUS } from '../src/respond'
import type { UpupServerConfig } from '../src/config'

const PASSED_THROUGH_STATUS = 424

const configFor = (
    tokenStore: InMemoryTokenStore,
    onError?: UpupServerConfig['onError'],
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'upstream-status-secret-0123456789',
    tokenStore,
    allowAnonymous: true,
    providers: {
        googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
    },
    ...(onError ? { onError } : {}),
})

const ORIGIN = 'http://localhost'

async function startFlow(handler: (req: Request) => Promise<Response>) {
    const res = await handler(new Request(`${ORIGIN}/auth/google-drive`))
    const setCookie = res.headers.get('Set-Cookie') as string
    const [name, nonce] = setCookie.split(';')[0]!.split('=') as [
        string,
        string,
    ]
    const state = new URL(
        res.headers.get('Location') as string,
    ).searchParams.get('state') as string
    return { name, nonce, state }
}

const callback = (
    handler: (req: Request) => Promise<Response>,
    flow: { name: string; nonce: string; state: string },
) =>
    handler(
        new Request(
            `${ORIGIN}/auth/google-drive/cb?code=bogus&state=${flow.state}`,
            { headers: { Cookie: `${flow.name}=${flow.nonce}` } },
        ),
    )

describe('upstream-provider token-exchange failures survive a Cloudflare-style proxy (T-6087)', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>
    afterEach(() => {
        fetchSpy?.mockRestore()
    })

    const expectUniformFailure = async (
        res: Response,
        store: InMemoryTokenStore,
        flow: { name: string },
        onError: ReturnType<typeof vi.fn>,
    ) => {
        // Not 502/504: those are the only origin statuses Cloudflare rewrites.
        expect(res.status).toBe(PASSED_THROUGH_STATUS)
        expect(res.headers.get('Content-Type')).toBe('application/json')
        expect(res.headers.get('x-upup-request-id')).toMatch(/^[0-9a-f-]{36}$/)
        expect(await res.json()).toEqual({
            error: 'Token exchange failed',
            code: 'AUTH_PROVIDER_ERROR',
        })
        // The state resolved to a real flow, so the nonce cookie is cleared.
        const cleared = res.headers.get('Set-Cookie') as string
        expect(cleared).toContain(`${flow.name}=;`)
        expect(cleared).toContain('Max-Age=0')
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).toBeNull()
        // The operator-facing log carries the same status the client saw.
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatchObject({
            route: 'auth/google-drive/cb',
            status: PASSED_THROUGH_STATUS,
            code: 'AUTH_PROVIDER_ERROR',
        })
    }

    it('the shared status constant is not a Cloudflare-rewritten one', () => {
        expect(UPSTREAM_FAILURE_STATUS).toBe(PASSED_THROUGH_STATUS)
        expect([502, 504]).not.toContain(UPSTREAM_FAILURE_STATUS)
    })

    it('a token endpoint that rejects the code answers JSON + code + request id', async () => {
        const store = new InMemoryTokenStore()
        const onError = vi.fn()
        const handler = createUpupHandler(configFor(store, onError))
        const flow = await startFlow(handler)
        fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response('{"error":"invalid_grant"}', { status: 400 }),
            )
        const res = await callback(handler, flow)
        await expectUniformFailure(res, store, flow, onError)
    })

    it('a token endpoint that answers 200 without an access_token is the same failure', async () => {
        const store = new InMemoryTokenStore()
        const onError = vi.fn()
        const handler = createUpupHandler(configFor(store, onError))
        const flow = await startFlow(handler)
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ token_type: 'Bearer' }), {
                status: 200,
            }),
        )
        const res = await callback(handler, flow)
        await expectUniformFailure(res, store, flow, onError)
    })

    it('a stalled or unreachable token endpoint is the same failure', async () => {
        const store = new InMemoryTokenStore()
        const onError = vi.fn()
        const handler = createUpupHandler(configFor(store, onError))
        const flow = await startFlow(handler)
        fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
        const res = await callback(handler, flow)
        await expectUniformFailure(res, store, flow, onError)
    })

    it('the trust checks are untouched: a forged callback is still 403, a bad state still 400', async () => {
        const store = new InMemoryTokenStore()
        const handler = createUpupHandler(configFor(store))
        const flow = await startFlow(handler)
        fetchSpy = vi.spyOn(globalThis, 'fetch')
        const forged = await callback(handler, {
            ...flow,
            nonce: '0'.repeat(64),
        })
        expect(forged.status).toBe(403)
        const unknown = await handler(
            new Request(`${ORIGIN}/auth/google-drive/cb?code=x&state=nope`),
        )
        expect(unknown.status).toBe(400)
        // Neither reached the provider's token endpoint.
        expect(fetchSpy).not.toHaveBeenCalled()
    })
})
