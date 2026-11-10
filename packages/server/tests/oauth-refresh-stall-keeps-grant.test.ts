// packages/server/tests/oauth-refresh-stall-keeps-grant.test.ts
//
// T-5494 follow-up (#623 review nit). When the refresh-token call STALLS and the
// 15 s AbortSignal fires:
//   - the stored grant is KEPT (a stall is not a revoked token, so it must not
//     be deleted the way a rejected refresh is);
//   - the drive route answers 401 `reauth`, never a router 500;
//   - the next request can refresh successfully with the kept grant.
//
// No real 15 s wait: AbortSignal.timeout is stubbed with a controller the test
// fires by hand, and the fetch mock rejects when that signal aborts, exactly as
// the platform fetch does on a real timeout.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    setTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import type { UpupServerConfig } from '../src/config'

const makeConfig = (
    store: InMemoryTokenStore,
    extra: Partial<UpupServerConfig> = {},
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'refresh-stall-secret-0123456789',
    allowAnonymous: true,
    tokenStore: store,
    providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
    ...extra,
})

const listReq = () => new Request('http://localhost/files/google-drive')

describe('a stalled refresh keeps the grant (T-5494)', () => {
    let store: InMemoryTokenStore
    let timeoutController: AbortController
    let timeoutMs: number | undefined
    let tokenCalls: number
    let driveCalls: number
    let stallRefresh: boolean

    beforeEach(async () => {
        store = new InMemoryTokenStore()
        // Expired access token + a refresh token: every list request refreshes.
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'OLD',
            refreshToken: 'RT',
            expiresAt: Date.now() - 60_000,
        })
        tokenCalls = 0
        driveCalls = 0
        stallRefresh = true
        timeoutMs = undefined
        timeoutController = new AbortController()

        vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
            timeoutMs = ms
            return timeoutController.signal
        })
        vi.spyOn(globalThis, 'fetch').mockImplementation(
            async (input, init) => {
                const url = String(input)
                if (url.includes('googleapis.com/drive')) {
                    driveCalls++
                    return new Response(JSON.stringify({ files: [] }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                }
                // The token endpoint.
                tokenCalls++
                if (!stallRefresh) {
                    return new Response(
                        JSON.stringify({
                            access_token: 'NEW',
                            expires_in: 3600,
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    )
                }
                const signal = init?.signal as AbortSignal
                return new Promise<Response>((_resolve, reject) => {
                    signal.addEventListener('abort', () =>
                        reject(signal.reason),
                    )
                })
            },
        )
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('keeps the grant, answers 401 reauth (not 500), then a later refresh succeeds with it', async () => {
        const onError = vi.fn()
        const handler = createUpupHandler(makeConfig(store, { onError }))

        // 1. The refresh call hangs until the (stubbed) 15 s signal fires.
        const pending = handler(listReq())
        await vi.waitFor(() => expect(tokenCalls).toBe(1))
        expect(timeoutMs).toBe(15_000)
        timeoutController.abort(new DOMException('timed out', 'TimeoutError'))
        const stalled = await pending

        expect(stalled.status).toBe(401)
        expect(await stalled.json()).toMatchObject({
            reauth: true,
            provider: 'google-drive',
        })
        expect(driveCalls).toBe(0)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatchObject({
            route: 'auth/google-drive/refresh',
        })

        // 2. The grant is still there (a rejected refresh would have deleted it).
        const kept = await getTokens(store, DEFAULT_USER_ID, 'google-drive')
        expect(kept?.refreshToken).toBe('RT')
        expect(kept?.accessToken).toBe('OLD')

        // 3. The provider recovers: the very next request refreshes with the
        //    kept grant, stores the new access token and serves the listing.
        stallRefresh = false
        timeoutController = new AbortController()
        const recovered = await handler(listReq())
        expect(recovered.status).toBe(200)
        expect(tokenCalls).toBe(2)
        expect(driveCalls).toBe(1)
        const refreshed = await getTokens(
            store,
            DEFAULT_USER_ID,
            'google-drive',
        )
        expect(refreshed?.accessToken).toBe('NEW')
        expect(refreshed?.refreshToken).toBe('RT')
    })

    it('contrast: a REJECTED refresh (provider says no) deletes the grant', async () => {
        const handler = createUpupHandler(makeConfig(store))
        stallRefresh = false
        vi.mocked(globalThis.fetch).mockImplementation(
            async () => new Response('revoked', { status: 400 }),
        )
        const res = await handler(listReq())
        expect(res.status).toBe(401)
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).toBeNull()
    })
})
