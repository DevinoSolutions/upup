// packages/server/tests/drive-transfer-reject-with-stuck-stream-release.test.ts
//
// T-7972: a drive transfer rejected AFTER the provider fetch has opened the
// download stream (the provider's real size over the cap, a client `accept`
// mismatch, a provider type outside allowedTypes, a refusing onBeforeUpload)
// must answer immediately. The rejection used to `await stream.cancel()` before
// returning, so a stream whose cancel() never settles (a tee'd branch whose
// sibling is never cancelled, a stalled socket) hung the response until the
// client gave up (observed live: POST /files/google-drive/transfer never
// answering a 413/415). Releasing the connection is best-effort and must never
// gate the response; the status/body stay exactly the same and nothing is stored.
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

/** Long enough to be unambiguous, short enough to keep the suite fast. */
const ANSWER_WITHIN_MS = 1500

const makeConfig = (
    store: InMemoryTokenStore,
    extra: Partial<UpupServerConfig> = {},
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'stuck-stream-release-secret-0123456789',
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

/** Google Drive reports `size` bytes of `type` named `name`; the download body
 *  is a stream whose cancel() NEVER settles, and every cancel() call is
 *  counted so the test can prove the connection release was still attempted. */
function stubGoogleDriveWithStuckCancel(
    name: string,
    type: string,
    size: number,
) {
    const cancelCalls = vi.fn()
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: unknown) => {
            if (!String(url).includes('alt=media')) {
                return new Response(
                    JSON.stringify({
                        name,
                        mimeType: type,
                        size: String(size),
                    }),
                    { status: 200 },
                )
            }
            const body = new ReadableStream<Uint8Array>({
                cancel() {
                    cancelCalls()
                    return new Promise<void>(() => {})
                },
            })
            return new Response(body, { status: 200 })
        }),
    )
    return cancelCalls
}

/** Resolves with the response, or rejects when it takes longer than the budget. */
function answeredWithin(
    pending: Promise<Response>,
    ms: number,
): Promise<Response> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`no response within ${ms} ms`)),
            ms,
        )
    })
    return Promise.race([pending, deadline]).finally(() => clearTimeout(timer))
}

describe('drive transfer: a post-fetch rejection never waits on releasing the drive stream (T-7972)', () => {
    let store: InMemoryTokenStore
    beforeEach(async () => {
        transferMock.mockReset()
        store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('answers 413 when the provider size is over the client cap, even if cancel() never settles', async () => {
        const cancelCalls = stubGoogleDriveWithStuckCancel(
            'a.png',
            'image/png',
            5000,
        )
        const handler = createUpupHandler(makeConfig(store))

        const res = await answeredWithin(
            handler(
                transferReq({
                    fileId: 'f1',
                    restrictions: { maxFileSize: 1000 },
                }),
            ),
            ANSWER_WITHIN_MS,
        )

        expect(res.status).toBe(413)
        expect(await res.json()).toEqual({ error: 'File too large' })
        expect(cancelCalls).toHaveBeenCalledTimes(1)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('answers 413 when a lying client size slips past the early-out, even if cancel() never settles', async () => {
        const cancelCalls = stubGoogleDriveWithStuckCancel(
            'a.png',
            'image/png',
            5000,
        )
        const handler = createUpupHandler(makeConfig(store))

        const res = await answeredWithin(
            handler(
                transferReq({
                    fileId: 'f1',
                    size: 100,
                    restrictions: { maxFileSize: 1000 },
                }),
            ),
            ANSWER_WITHIN_MS,
        )

        expect(res.status).toBe(413)
        expect(await res.json()).toEqual({ error: 'File too large' })
        expect(cancelCalls).toHaveBeenCalledTimes(1)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('answers 415 when the provider type misses the client accept, even if cancel() never settles', async () => {
        const cancelCalls = stubGoogleDriveWithStuckCancel(
            'a.png',
            'image/png',
            100,
        )
        const handler = createUpupHandler(makeConfig(store))

        const res = await answeredWithin(
            handler(
                transferReq({
                    fileId: 'f1',
                    restrictions: { accept: 'application/pdf' },
                }),
            ),
            ANSWER_WITHIN_MS,
        )

        expect(res.status).toBe(415)
        expect(await res.json()).toEqual({ error: 'File type not allowed' })
        expect(cancelCalls).toHaveBeenCalledTimes(1)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('answers 415 when the provider type is outside server allowedTypes, even if cancel() never settles', async () => {
        const cancelCalls = stubGoogleDriveWithStuckCancel(
            'doc.pdf',
            'application/pdf',
            100,
        )
        const handler = createUpupHandler(
            makeConfig(store, { allowedTypes: ['image/*'] }),
        )

        const res = await answeredWithin(
            handler(transferReq({ fileId: 'f1', mimeType: 'image/png' })),
            ANSWER_WITHIN_MS,
        )

        expect(res.status).toBe(415)
        expect(await res.json()).toEqual({ error: 'File type not allowed' })
        expect(cancelCalls).toHaveBeenCalledTimes(1)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('answers 403 when onBeforeUpload refuses, even if cancel() never settles', async () => {
        const cancelCalls = stubGoogleDriveWithStuckCancel(
            'a.png',
            'image/png',
            100,
        )
        const handler = createUpupHandler(
            makeConfig(store, {
                hooks: { onBeforeUpload: async () => false },
            }),
        )

        const res = await answeredWithin(
            handler(transferReq({ fileId: 'f1' })),
            ANSWER_WITHIN_MS,
        )

        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'Upload rejected' })
        expect(cancelCalls).toHaveBeenCalledTimes(1)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('answers 500 when the transfer itself fails, even if cancel() never settles', async () => {
        const cancelCalls = stubGoogleDriveWithStuckCancel(
            'a.png',
            'image/png',
            100,
        )
        transferMock.mockRejectedValue(new Error('s3 down'))
        const handler = createUpupHandler(makeConfig(store))

        const res = await answeredWithin(
            handler(transferReq({ fileId: 'f1' })),
            ANSWER_WITHIN_MS,
        )

        expect(res.status).toBe(500)
        expect(cancelCalls).toHaveBeenCalledTimes(1)
    })
})
