// packages/server/tests/drive-transfer-mime-trust.test.ts
//
// T-5467: the drive-transfer path must not trust the client-sent mimeType.
// The type that is checked against `allowedTypes`, handed to `onBeforeUpload`
// and stored as the object's ContentType comes from the PROVIDER's metadata;
// the client's claim is only a fallback when the provider reports nothing
// (or only the generic application/octet-stream), and even then it has already
// been through the allowedTypes gate.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UpupError, UpupErrorCode } from '@useupup/core'
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
    uploadTokenSecret: 'mime-trust-secret-0123456789',
    tokenStore: store,
    allowAnonymous: true,
    providers: {
        googleDrive: { clientId: 'gid', clientSecret: 'gsec' },
        dropbox: { appKey: 'dkey', appSecret: 'dsec' },
    },
    ...extra,
})

const transferReq = (provider: string, body: Record<string, unknown>) =>
    new Request(`http://localhost/files/${provider}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

/** Google Drive: files.get?fields=... returns the metadata JSON, ?alt=media
 *  returns the bytes. `providerType` is what the PROVIDER says the file is. */
function stubGoogleDrive(providerType: string | undefined) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: unknown) => {
            if (String(url).includes('alt=media')) {
                return new Response('<script>alert(1)</script>', {
                    status: 200,
                })
            }
            return new Response(
                JSON.stringify({
                    name: 'evil.html',
                    size: '25',
                    ...(providerType !== undefined
                        ? { mimeType: providerType }
                        : {}),
                }),
                { status: 200 },
            )
        }),
    )
}

function stubDropbox(contentType: string, name: string) {
    vi.stubGlobal(
        'fetch',
        vi.fn(
            async () =>
                new Response('bytes', {
                    status: 200,
                    headers: {
                        'Dropbox-API-Result': JSON.stringify({ name, size: 5 }),
                        'Content-Type': contentType,
                    },
                }),
        ),
    )
}

describe('drive transfer: provider-reported mimeType is authoritative (T-5467)', () => {
    let store: InMemoryTokenStore
    beforeEach(async () => {
        transferMock.mockReset()
        transferMock.mockResolvedValue({
            key: 'k',
            name: 'evil.html',
            size: 25,
            type: 'text/html',
        })
        store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
        await setTokens(store, DEFAULT_USER_ID, 'dropbox', {
            accessToken: 'AT',
        })
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('rejects a spoofed image/png claim when the provider says text/html and allowedTypes is image/*', async () => {
        stubGoogleDrive('text/html')
        const handler = createUpupHandler(
            makeConfig(store, { allowedTypes: ['image/*'] }),
        )
        const res = await handler(
            transferReq('google-drive', {
                fileId: 'f1',
                size: 25,
                mimeType: 'image/png',
            }),
        )
        expect(res.status).toBe(415)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('stores the PROVIDER type (not the client claim) when no allowlist is configured', async () => {
        stubGoogleDrive('text/html')
        const handler = createUpupHandler(makeConfig(store))
        const res = await handler(
            transferReq('google-drive', {
                fileId: 'f1',
                size: 25,
                mimeType: 'image/png',
            }),
        )
        expect(res.status).toBe(200)
        expect(transferMock).toHaveBeenCalledTimes(1)
        expect(transferMock.mock.calls[0]![0].mimeType).toBe('text/html')
    })

    it('falls back to the (already-gated) client type when the provider reports only application/octet-stream', async () => {
        stubDropbox('application/octet-stream', 'a.png')
        const handler = createUpupHandler(
            makeConfig(store, { allowedTypes: ['image/*'] }),
        )
        const res = await handler(
            transferReq('dropbox', {
                fileId: '/a.png',
                size: 5,
                mimeType: 'image/png',
            }),
        )
        expect(res.status).toBe(200)
        expect(transferMock.mock.calls[0]![0].mimeType).toBe('image/png')
    })

    it('rejects when a specific provider Content-Type (Dropbox/Box header) disagrees with the claim', async () => {
        stubDropbox('text/html; charset=utf-8', 'a.html')
        const handler = createUpupHandler(
            makeConfig(store, { allowedTypes: ['image/*'] }),
        )
        const res = await handler(
            transferReq('dropbox', {
                fileId: '/a.html',
                size: 5,
                mimeType: 'image/png',
            }),
        )
        expect(res.status).toBe(415)
        expect(transferMock).not.toHaveBeenCalled()
    })
})

describe('drive transfer: onBeforeUpload gate (T-5467)', () => {
    let store: InMemoryTokenStore
    beforeEach(async () => {
        transferMock.mockReset()
        transferMock.mockResolvedValue({
            key: 'k',
            name: 'doc.txt',
            size: 25,
            type: 'text/plain',
        })
        store = new InMemoryTokenStore()
        await setTokens(store, DEFAULT_USER_ID, 'google-drive', {
            accessToken: 'AT',
        })
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('calls onBeforeUpload with the provider-verified {name,type,size} and the request, then transfers', async () => {
        stubGoogleDrive('text/plain')
        const onBeforeUpload = vi.fn(async () => true)
        const handler = createUpupHandler(
            makeConfig(store, { hooks: { onBeforeUpload } }),
        )
        const res = await handler(
            transferReq('google-drive', {
                fileId: 'f1',
                fileName: 'doc.txt',
                size: 1,
                mimeType: 'image/png',
            }),
        )
        expect(res.status).toBe(200)
        expect(onBeforeUpload).toHaveBeenCalledTimes(1)
        const [file, req] = onBeforeUpload.mock.calls[0] as unknown as [
            { name: string; type: string; size: number },
            Request,
        ]
        expect(file).toMatchObject({
            name: 'doc.txt',
            type: 'text/plain',
            size: 25,
        })
        expect(req).toBeInstanceOf(Request)
        expect(transferMock).toHaveBeenCalledTimes(1)
    })

    it('403s and never transfers when onBeforeUpload returns false', async () => {
        stubGoogleDrive('text/plain')
        const handler = createUpupHandler(
            makeConfig(store, { hooks: { onBeforeUpload: async () => false } }),
        )
        const res = await handler(
            transferReq('google-drive', { fileId: 'f1', size: 25 }),
        )
        expect(res.status).toBe(403)
        expect(transferMock).not.toHaveBeenCalled()
    })

    it('403s with the UpupError message when onBeforeUpload throws one (same contract as the upload routes)', async () => {
        stubGoogleDrive('text/plain')
        const handler = createUpupHandler(
            makeConfig(store, {
                hooks: {
                    onBeforeUpload: async () => {
                        throw new UpupError(
                            'Quota exceeded',
                            UpupErrorCode.BAD_REQUEST,
                        )
                    },
                },
            }),
        )
        const res = await handler(
            transferReq('google-drive', { fileId: 'f1', size: 25 }),
        )
        expect(res.status).toBe(403)
        expect(((await res.json()) as { error: string }).error).toBe(
            'Quota exceeded',
        )
        expect(transferMock).not.toHaveBeenCalled()
    })
})
