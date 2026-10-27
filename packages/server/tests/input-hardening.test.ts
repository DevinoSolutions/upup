// packages/server/tests/input-hardening.test.ts
//
// T-5494 (audit finding 9, LOW items verified real at HEAD):
//  - a JSON body that is not an object (null, array, scalar) was cast and then
//    dereferenced, surfacing as a 500; it is a client error -> 400.
//  - an upload token with extra dot-segments verified (only the first two were
//    read); it must be rejected as malformed.
// (The token-exchange checks are in oauth-token-exchange.test.ts and the
// health-probe cache in health.test.ts.)
import { describe, it, expect, vi } from 'vitest'
import { createUpupHandler } from '../src/handler'
import {
    signUploadToken,
    verifyUploadToken,
    UploadTokenError,
} from '../src/uploadToken'
import {
    InMemoryTokenStore,
    setTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
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

const SECRET = 'input-hardening-secret-0123456789'

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

const rawPost = (path: string, rawBody: string) =>
    new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
    })

describe('a non-object JSON body is a 400, never a 500 (T-5494)', () => {
    const routes = [
        '/presign',
        '/multipart/init',
        '/multipart/sign-part',
        '/multipart/complete',
        '/multipart/abort',
        '/multipart/resume',
        '/files/google-drive/transfer',
    ]
    const bodies = ['null', '[]', '[1,2]', '42', '"text"', 'true']

    for (const route of routes) {
        it(`${route} answers 400 for ${bodies.join(' / ')}`, async () => {
            const store = new InMemoryTokenStore()
            await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
                accessToken: 'AT',
            })
            const handler = createUpupHandler(makeConfig(store))
            for (const body of bodies) {
                const res = await handler(rawPost(route, body))
                expect(res.status, `${route} <- ${body}`).toBe(400)
            }
        })
    }

    it('a real object body still reaches the route (sanity: an empty object is not a 400 here)', async () => {
        const handler = createUpupHandler(makeConfig())
        const res = await handler(rawPost('/multipart/sign-part', '{}'))
        expect(res.status).not.toBe(500)
        expect(res.status).not.toBe(400)
    })
})

describe('upload token with extra segments is malformed (T-5494)', () => {
    const payload = {
        k: 'k',
        u: 'u',
        uid: null,
        smin: 0,
        smax: 10,
        ps: 5 * 1024 * 1024,
        exp: Math.floor(Date.now() / 1000) + 600,
    }

    it('verifyUploadToken rejects body.sig.extra even though body.sig is valid', async () => {
        const token = await signUploadToken(SECRET, payload)
        await expect(
            verifyUploadToken(SECRET, `${token}.extra`, Date.now()),
        ).rejects.toMatchObject({ code: 'malformed' })
        await expect(
            verifyUploadToken(SECRET, `${token}.`, Date.now()),
        ).rejects.toBeInstanceOf(UploadTokenError)
        // control: the exact two-segment token still verifies
        await expect(
            verifyUploadToken(SECRET, token, Date.now()),
        ).resolves.toMatchObject({ k: 'k' })
    })

    it('the route answers 403 malformed for it', async () => {
        const handler = createUpupHandler(makeConfig())
        const token = await signUploadToken(SECRET, payload)
        const res = await handler(
            rawPost(
                '/multipart/abort',
                JSON.stringify({ token: `${token}.junk` }),
            ),
        )
        expect(res.status).toBe(403)
        expect(((await res.json()) as { code: string }).code).toBe('malformed')
    })
})
