// T-7540: MIME types are case-insensitive (RFC 2045). A client claiming
// `IMAGE/PNG` against a lower-case server `allowedTypes` was rejected on both
// shared-policy callers; these drive the REAL handler through each of them.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn().mockResolvedValue({
        key: 'u1/uuid/photo.png',
        uploadUrl: 'https://bucket.example.com/photo.png?sig',
        downloadUrl: 'https://bucket.example.com/photo.png?get',
        uploadHeaders: { 'Content-Type': 'image/png' },
        expiresIn: 3600,
    }),
    initiateMultipartUpload: vi.fn(),
    generatePresignedPartUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}))

const transferMock = vi.hoisted(() => vi.fn())
vi.mock('../src/transfer', () => ({ transferDriveFileToS3: transferMock }))

import { createUpupHandler } from '../src/handler'
import {
    InMemoryTokenStore,
    setTokens,
    DEFAULT_USER_ID,
} from '../src/tokenStore'
import type { UpupServerConfig } from '../src/config'

const makeConfig = (
    store: InMemoryTokenStore,
    allowedTypes?: string[],
): UpupServerConfig => ({
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'mixed-case-types-secret-0123456789',
    tokenStore: store,
    allowAnonymous: true,
    allowAnonymousUploads: true,
    ...(allowedTypes ? { allowedTypes } : {}),
    providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
})

const post = (path: string, body: Record<string, unknown>) =>
    new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

describe('allowedTypes is case-insensitive through the routes (T-7540)', () => {
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

    it('/presign accepts a mixed-case type that the allowlist names in lower case', async () => {
        const handler = createUpupHandler(makeConfig(store, ['image/png']))

        const res = await handler(
            post('/presign', {
                name: 'photo.png',
                type: 'IMAGE/PNG',
                size: 10,
            }),
        )

        expect(res.status).toBe(200)
    })

    it('/presign still 415s a different type under a wildcard allowlist', async () => {
        const handler = createUpupHandler(makeConfig(store, ['image/*']))

        const res = await handler(
            post('/presign', { name: 'a.txt', type: 'TEXT/PLAIN', size: 10 }),
        )

        expect(res.status).toBe(415)
    })

    /** Google Drive reports `mimeType` (omitted when undefined) for the file. */
    const stubDrive = (mimeType: string | undefined) => {
        const driveFetch = vi.fn(async (url: unknown) =>
            String(url).includes('alt=media')
                ? new Response('x'.repeat(100), { status: 200 })
                : new Response(
                      JSON.stringify({
                          name: 'a.png',
                          mimeType,
                          size: '100',
                      }),
                      { status: 200 },
                  ),
        )
        vi.stubGlobal('fetch', driveFetch)
        return driveFetch
    }

    it('drive transfer accepts a mixed-case claimed type against a lower-case allowlist', async () => {
        stubDrive('image/png')
        const handler = createUpupHandler(makeConfig(store, ['image/*']))

        const res = await handler(
            post('/files/google-drive/transfer', {
                fileId: 'f1',
                size: 100,
                mimeType: 'IMAGE/PNG',
            }),
        )

        expect(res.status).toBe(200)
        expect(transferMock).toHaveBeenCalledTimes(1)
    })

    it.each([undefined, 'application/octet-stream'])(
        're-gates a mixed-case CLAIMED type when the provider reports %s',
        async reported => {
            stubDrive(reported)
            const handler = createUpupHandler(makeConfig(store, ['image/*']))

            const res = await handler(
                post('/files/google-drive/transfer', {
                    fileId: 'f1',
                    size: 100,
                    mimeType: 'IMAGE/PNG',
                }),
            )

            expect(res.status).toBe(200)
            expect(transferMock).toHaveBeenCalledTimes(1)
        },
    )

    it.each([['image/png'], ['image/*']])(
        'drive transfer 415s (not 500) a non-string mimeType against %s',
        async allowed => {
            stubDrive('image/png')
            const handler = createUpupHandler(makeConfig(store, [allowed!]))

            const res = await handler(
                post('/files/google-drive/transfer', {
                    fileId: 'f1',
                    size: 100,
                    mimeType: 123,
                }),
            )

            expect(res.status).toBe(415)
            expect(transferMock).not.toHaveBeenCalled()
        },
    )

    it.each([[123], [{}], [[]], [true], [null]])(
        'drive transfer 400s a non-string mimeType (%j) when no allowlist is configured (T-7833)',
        async bad => {
            const driveFetch = stubDrive('image/png')
            const handler = createUpupHandler(makeConfig(store))

            const res = await handler(
                post('/files/google-drive/transfer', {
                    fileId: 'f1',
                    size: 100,
                    mimeType: bad,
                }),
            )

            expect(res.status).toBe(400)
            expect(await res.json()).toEqual({ error: 'Invalid mimeType' })
            expect(driveFetch).not.toHaveBeenCalled()
            expect(transferMock).not.toHaveBeenCalled()
        },
    )

    it('drive transfer still 200s an absent mimeType when no allowlist is configured (T-7833)', async () => {
        stubDrive('image/png')
        const handler = createUpupHandler(makeConfig(store))

        const res = await handler(
            post('/files/google-drive/transfer', { fileId: 'f1', size: 100 }),
        )

        expect(res.status).toBe(200)
        expect(transferMock).toHaveBeenCalledTimes(1)
    })
})
