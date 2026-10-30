// packages/server/tests/oauth-callback-failure-status.test.ts
//
// T-6087: a failed OAuth token exchange in GET /auth/:provider/cb used to answer
// 502 for every cause. Cloudflare replaces an origin 502/504 with its own
// text/plain "error code: 502" page, so a provider rejection (a fault the client
// has to fix) lost its JSON body, AUTH_PROVIDER_ERROR code and x-upup-request-id
// and looked like a Cloudflare outage. The callback now maps each cause:
//  - the provider rejected the code or the integrator's OAuth app (a 4xx, or an
//    OAuth `error` in a 200 body): 424, not retryable, passed through by Cloudflare;
//  - the provider was unreachable, timed out, answered 5xx/429/408 (or a non-4xx
//    error), or sent a 200 with neither a token nor an error, or a non-JSON 200:
//    502, where starting the sign-in again may succeed.
// The body shape, the request id and the cleared nonce cookie are identical for both.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import {
    DEPENDENCY_REJECTED_STATUS,
    UPSTREAM_UNAVAILABLE_STATUS,
    providerFailureStatus,
} from '../src/respond'
import type { UpupServerConfig } from '../src/config'

const configFor = (
    tokenStore: InMemoryTokenStore,
    onError?: UpupServerConfig['onError'],
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'callback-status-secret-0123456789',
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

const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

describe('OAuth callback token-exchange failures are mapped per cause (T-6087)', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>
    afterEach(() => {
        fetchSpy?.mockRestore()
    })

    const runCallback = async (
        provider: () => Promise<Response>,
    ): Promise<{
        res: Response
        store: InMemoryTokenStore
        cookieName: string
        onError: ReturnType<typeof vi.fn>
    }> => {
        const store = new InMemoryTokenStore()
        const onError = vi.fn()
        const handler = createUpupHandler(configFor(store, onError))
        const flow = await startFlow(handler)
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(provider)
        const res = await callback(handler, flow)
        return { res, store, cookieName: flow.name, onError }
    }

    const expectFailure = async (
        run: Awaited<ReturnType<typeof runCallback>>,
        status: number,
    ) => {
        const { res, store, cookieName, onError } = run
        expect(res.status).toBe(status)
        expect(res.headers.get('Content-Type')).toBe('application/json')
        expect(res.headers.get('x-upup-request-id')).toMatch(/^[0-9a-f-]{36}$/)
        expect(await res.json()).toEqual({
            error: 'Token exchange failed',
            code: 'AUTH_PROVIDER_ERROR',
        })
        // The state resolved to a real flow, so the nonce cookie is cleared.
        const cleared = res.headers.get('Set-Cookie') as string
        expect(cleared).toContain(`${cookieName}=;`)
        expect(cleared).toContain('Max-Age=0')
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).toBeNull()
        // The operator-facing log carries the same status the client saw.
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatchObject({
            route: 'auth/google-drive/cb',
            status,
            code: 'AUTH_PROVIDER_ERROR',
        })
    }

    it('the two statuses are 424 (client must fix) and 502 (ours or transient)', () => {
        expect(DEPENDENCY_REJECTED_STATUS).toBe(424)
        expect(UPSTREAM_UNAVAILABLE_STATUS).toBe(502)
    })

    it.each([400, 401, 403, 404, 422])(
        'a provider %i rejected what the client sent: 424',
        async providerStatus => {
            await expectFailure(
                await runCallback(async () =>
                    json({ error: 'invalid_grant' }, providerStatus),
                ),
                424,
            )
        },
    )

    it.each([500, 502, 503, 504, 429, 408])(
        'a provider %i is transient: 502',
        async providerStatus => {
            await expectFailure(
                await runCallback(async () =>
                    json({ error: 'temporarily_unavailable' }, providerStatus),
                ),
                502,
            )
        },
    )

    it('an unreachable or timed-out token endpoint is transient: 502', async () => {
        await expectFailure(
            await runCallback(async () => {
                throw new DOMException('timed out', 'TimeoutError')
            }),
            502,
        )
    })

    it('a 200 carrying an OAuth error and no access_token is a rejection: 424', async () => {
        await expectFailure(
            await runCallback(async () =>
                json({ error: 'bad_verification_code' }, 200),
            ),
            424,
        )
    })

    it('a 200 with neither an access_token nor an error is malformed: 502', async () => {
        await expectFailure(
            await runCallback(async () => json({ token_type: 'Bearer' }, 200)),
            502,
        )
    })

    it('a 200 with an empty error and no access_token is malformed: 502', async () => {
        await expectFailure(
            await runCallback(async () => json({ error: '' }, 200)),
            502,
        )
    })

    it('a 200 whose body is not JSON is malformed: 502, not the router 500', async () => {
        await expectFailure(
            await runCallback(
                async () =>
                    new Response('<html>maintenance</html>', {
                        status: 200,
                        headers: { 'Content-Type': 'text/html' },
                    }),
            ),
            502,
        )
    })

    it('providerFailureStatus maps only a 4xx other than 408/429 to 424', () => {
        expect(providerFailureStatus(400)).toBe(424)
        expect(providerFailureStatus(401)).toBe(424)
        expect(providerFailureStatus(499)).toBe(424)
        expect(providerFailureStatus(408)).toBe(502)
        expect(providerFailureStatus(429)).toBe(502)
        expect(providerFailureStatus(500)).toBe(502)
        expect(providerFailureStatus(599)).toBe(502)
        // An unfollowed redirect or an informational status is not a rejection.
        expect(providerFailureStatus(304)).toBe(502)
        expect(providerFailureStatus(399)).toBe(502)
        expect(providerFailureStatus(101)).toBe(502)
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
