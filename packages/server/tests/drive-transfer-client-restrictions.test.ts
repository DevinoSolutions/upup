// packages/server/tests/drive-transfer-client-restrictions.test.ts
//
// T-7058: the client sends its own restrictions (maxFileSize, accept) with a
// drive transfer so a file it would refuse never reaches storage (the object
// used to be stored first and orphaned when the client then rejected it).
// They are an ADDITIONAL tightening only: effective cap = min(server, client),
// and a client value can never loosen the server policy. The streamed-cap
// abort path is the existing one (`maxBytes` handed to transferDriveFileToS3).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUpupHandler } from '../src/handler'
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
}))

const transferMock = vi.hoisted(() => vi.fn())
vi.mock('../src/transfer', () => ({ transferDriveFileToS3: transferMock }))

const makeConfig = (
    store: InMemoryTokenStore,
    extra: Partial<UpupServerConfig> = {},
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'client-restrictions-secret-0123456789',
    tokenStore: store,
    allowAnonymous: true,
    providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
    ...extra,
})

const transferReq = (body: Record<string, unknown>) =>
    new Request('http://localhost/files/google-drive/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

/** Google Drive reports `size` bytes of `type` named `name`. */
function stubGoogleDrive(name: string, type: string, size: number) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: unknown) =>
            String(url).includes('alt=media')
                ? new Response('x'.repeat(size), { status: 200 })
                : new Response(
                      JSON.stringify({
                          name,
                          mimeType: type,
                          size: String(size),
                      }),
                      { status: 200 },
                  ),
        ),
    )
}

describe('drive transfer: client restrictions only tighten (T-7058)', () => {
    let store: InMemoryTokenStore
    beforeEach(async () => {
        transferMock.mockReset()
        transferMock.mockResolvedValue({
            key: 'k',
            name: 'a.png',
            size: 100,
            type: 'image/png',
        })
        store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('413s a declared size over the client cap before any drive call', async () => {
        const fetchSpy = vi.fn()
        vi.stubGlobal('fetch', fetchSpy)
        const handler = createUpupHandler(makeConfig(store))

        const res = await handler(
            transferReq({
                fileId: 'f1',
                size: 5000,
                restrictions: { maxFileSize: 1000 },
            }),
        )

        expect(res.status).toBe(413)
        expect(fetchSpy).not.toHaveBeenCalled()
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('413s when the PROVIDER-reported size is over the client cap (nothing stored)', async () => {
        stubGoogleDrive('a.png', 'image/png', 5000)
        const handler = createUpupHandler(makeConfig(store))

        const res = await handler(
            transferReq({
                fileId: 'f1',
                restrictions: { maxFileSize: 1000 },
            }),
        )

        expect(res.status).toBe(413)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('hands the effective cap to the streamed-cap path: min(server, client)', async () => {
        stubGoogleDrive('a.png', 'image/png', 100)
        const handler = createUpupHandler(
            makeConfig(store, { maxFileSize: 10_000 }),
        )

        const res = await handler(
            transferReq({
                fileId: 'f1',
                size: 100,
                restrictions: { maxFileSize: 1000 },
            }),
        )

        expect(res.status).toBe(200)
        expect(transferMock.mock.calls[0]![0].maxBytes).toBe(1000)
    })

    it('a client cap LARGER than the server cap never loosens it', async () => {
        stubGoogleDrive('a.png', 'image/png', 5000)
        const handler = createUpupHandler(
            makeConfig(store, { maxFileSize: 1000 }),
        )

        const res = await handler(
            transferReq({
                fileId: 'f1',
                restrictions: { maxFileSize: 1_000_000 },
            }),
        )

        expect(res.status).toBe(413)
        expect(transferMock).not.toHaveBeenCalled()

        stubGoogleDrive('a.png', 'image/png', 500)
        const ok = await handler(
            transferReq({
                fileId: 'f1',
                restrictions: { maxFileSize: 1_000_000 },
            }),
        )
        expect(ok.status).toBe(200)
        expect(transferMock.mock.calls[0]![0].maxBytes).toBe(1000)
    })

    it('ignores a malformed client cap instead of loosening or crashing', async () => {
        stubGoogleDrive('a.png', 'image/png', 500)
        const handler = createUpupHandler(
            makeConfig(store, { maxFileSize: 1000 }),
        )

        for (const bad of [-1, 0, 'big', null, Number.NaN]) {
            transferMock.mockClear()
            const res = await handler(
                transferReq({
                    fileId: 'f1',
                    restrictions: { maxFileSize: bad },
                }),
            )
            expect(res.status).toBe(200)
            expect(transferMock.mock.calls[0]![0].maxBytes).toBe(1000)
        }
    })

    it('415s a provider type outside the client accept before any S3 call', async () => {
        stubGoogleDrive('doc.pdf', 'application/pdf', 100)
        const handler = createUpupHandler(makeConfig(store))

        const res = await handler(
            transferReq({
                fileId: 'f1',
                restrictions: { accept: 'image/*' },
            }),
        )

        expect(res.status).toBe(415)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('accept honours exact MIME, type/* wildcards and .extension entries', async () => {
        const handler = createUpupHandler(makeConfig(store))
        const cases: Array<[string, string, string, number]> = [
            ['a.png', 'image/png', 'image/png', 200],
            ['a.png', 'image/png', 'image/*', 200],
            ['a.PDF', 'application/pdf', '.pdf', 200],
            ['a.pdf', 'application/pdf', 'image/*,.pdf', 200],
            ['a.png', 'image/png', '*/*', 200],
            ['a.txt', 'text/plain', 'image/*,.pdf', 415],
            ['a.txt', 'text/plain', '.png', 415],
        ]
        for (const [name, type, accept, status] of cases) {
            stubGoogleDrive(name, type, 10)
            const res = await handler(
                transferReq({ fileId: 'f1', restrictions: { accept } }),
            )
            expect(res.status, `${name} ${type} vs ${accept}`).toBe(status)
        }
    })

    it('a client accept cannot loosen the server allowedTypes', async () => {
        stubGoogleDrive('doc.pdf', 'application/pdf', 100)
        const handler = createUpupHandler(
            makeConfig(store, { allowedTypes: ['image/*'] }),
        )

        const res = await handler(
            transferReq({
                fileId: 'f1',
                mimeType: 'image/png',
                restrictions: { accept: '*/*' },
            }),
        )

        expect(res.status).toBe(415)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('behaves exactly as before when no restrictions are sent', async () => {
        stubGoogleDrive('a.png', 'image/png', 100)
        const handler = createUpupHandler(makeConfig(store))

        const res = await handler(transferReq({ fileId: 'f1', size: 100 }))

        expect(res.status).toBe(200)
        expect(transferMock.mock.calls[0]![0].maxBytes).toBeUndefined()
    })
})
