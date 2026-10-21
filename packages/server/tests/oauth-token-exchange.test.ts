// packages/server/tests/oauth-token-exchange.test.ts
//
// T-5494 (audit finding 9, items verified real at HEAD):
//  - the token-exchange response was not checked for an access_token, so a
//    provider answering 200 without one stored `undefined` as the credential.
//  - the token endpoint calls had no timeout.
// (The health-probe cache is covered in health.test.ts.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    getTokens,
    setTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import { refreshAccessToken } from '../src/oauth'
import type { UpupServerConfig } from '../src/config'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn(),
    initiateMultipartUpload: vi.fn(),
    generatePresignedPartUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
    checkStorageReachable: vi.fn().mockResolvedValue({ ok: true }),
}))

const SECRET = 'token-exchange-secret-0123456789'

const makeConfig = (
    store = new InMemoryTokenStore(),
    extra: Partial<UpupServerConfig> = {},
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: SECRET,
    allowAnonymousUploads: true,
    allowAnonymous: true,
    tokenStore: store,
    providers: {
        googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
    },
    ...extra,
})

describe('OAuth token exchange validation + timeout (T-5494)', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>
    afterEach(() => {
        fetchSpy?.mockRestore()
    })

    const flow = async (store: InMemoryTokenStore) => {
        const handler = createUpupHandler(makeConfig(store))
        const start = await handler(
            new Request('http://localhost/auth/google-drive'),
        )
        const state = new URL(
            start.headers.get('Location') as string,
        ).searchParams.get('state') as string
        const cookie = (start.headers.get('Set-Cookie') as string).split(';')[0]
        return { handler, state, cookie: cookie as string }
    }

    it('a 200 token response WITHOUT access_token is a 502 and stores nothing', async () => {
        const store = new InMemoryTokenStore()
        const { handler, state, cookie } = await flow(store)
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ token_type: 'Bearer' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        )
        const res = await handler(
            new Request(
                `http://localhost/auth/google-drive/cb?code=c&state=${state}`,
                { headers: { Cookie: cookie } },
            ),
        )
        expect(res.status).toBe(502)
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).toBeNull()
    })

    it('an empty or non-string access_token is refused too', async () => {
        for (const bad of ['', 123, null]) {
            const store = new InMemoryTokenStore()
            const { handler, state, cookie } = await flow(store)
            fetchSpy?.mockRestore()
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                new Response(JSON.stringify({ access_token: bad }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
            )
            const res = await handler(
                new Request(
                    `http://localhost/auth/google-drive/cb?code=c&state=${state}`,
                    { headers: { Cookie: cookie } },
                ),
            )
            expect(res.status, String(bad)).toBe(502)
            expect(
                await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
            ).toBeNull()
        }
    })

    it('the callback token fetch carries an AbortSignal timeout, and a timed-out fetch is a clean 502', async () => {
        const store = new InMemoryTokenStore()
        const { handler, state, cookie } = await flow(store)
        let seen: AbortSignal | undefined | null
        fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementation(async (_url, init) => {
                seen = init?.signal
                throw new DOMException('timed out', 'TimeoutError')
            })
        const res = await handler(
            new Request(
                `http://localhost/auth/google-drive/cb?code=c&state=${state}`,
                { headers: { Cookie: cookie } },
            ),
        )
        expect(seen).toBeInstanceOf(AbortSignal)
        expect(res.status).toBe(502)
        expect(
            await getTokens(store, DEFAULT_USER_ID, 'google-drive'),
        ).toBeNull()
    })

    describe('refreshAccessToken', () => {
        const config = makeConfig()
        const stale = {
            accessToken: 'OLD',
            refreshToken: 'RT',
        }

        beforeEach(async () => {
            await setTokens(
                config.tokenStore!,
                DEFAULT_USER_ID,
                'google-drive',
                stale,
            )
        })

        it('passes a timeout signal to the refresh call', async () => {
            let seen: AbortSignal | undefined | null
            fetchSpy = vi
                .spyOn(globalThis, 'fetch')
                .mockImplementation(async (_url, init) => {
                    seen = init?.signal
                    return new Response(
                        JSON.stringify({ access_token: 'NEW' }),
                        { status: 200 },
                    )
                })
            const next = await refreshAccessToken(
                config,
                'google-drive',
                DEFAULT_USER_ID,
                stale,
            )
            expect(seen).toBeInstanceOf(AbortSignal)
            expect(next?.accessToken).toBe('NEW')
        })

        it('a refresh answering 200 without access_token forces re-auth instead of storing undefined', async () => {
            fetchSpy = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValue(
                    new Response(JSON.stringify({}), { status: 200 }),
                )
            const next = await refreshAccessToken(
                config,
                'google-drive',
                DEFAULT_USER_ID,
                stale,
            )
            expect(next).toBeNull()
            expect(
                await getTokens(
                    config.tokenStore!,
                    DEFAULT_USER_ID,
                    'google-drive',
                ),
            ).toBeNull()
        })
    })
})
