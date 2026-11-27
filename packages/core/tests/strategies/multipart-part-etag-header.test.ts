// Contract: a part's ETag comes from storage or the part fails. It is never
// made up.
//
// `complete` assembles the object from the ETag storage returned for each part.
// A browser only lets a page read that response header when the bucket's CORS
// rule lists it in ExposeHeaders. When it does not, the strategy used to send
// `"part-<n>"` in its place, and `complete` then failed with a storage error
// that named neither the header nor CORS — or, on a store that does not check
// part ETags, could assemble an object nobody verified. The fix is a bucket
// setting, so the error has to say so, on the first part, without retries.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultipartUpload } from '../../src/strategies/multipart-upload'
import { UpupErrorCode, UpupStorageError } from '../../src/errors'
import type { CredentialStrategy } from '../../src/contracts-strategies'
import type { PresignedUrlResponse } from '@useupup/core'
import { UploadManager } from '../../src/upload-manager'
import type { UploadFile } from '@useupup/core'
import { installXhrPartMock, type PartRequest } from './xhr-part-mock'

const PART = 1024

// MultipartUpload never reads its `credentials` param — a minimal,
// type-correct stand-in satisfies the UploadStrategy#upload signature.
const unusedCredentials: PresignedUrlResponse = {
    key: '',
    uploadUrl: '',
    expiresIn: 0,
}

function makeCredentials() {
    return {
        getPresignedUrl: vi.fn(),
        initMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            uploadId: 'upload-123',
            partSize: PART,
            expiresIn: 3600,
            token: 'tok-abc',
        }),
        signPart: vi.fn().mockImplementation(async ({ partNumber }) => ({
            uploadUrl: `https://s3/part${partNumber}?signed`,
            expiresIn: 3600,
        })),
        completeMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/big.zip',
            etag: '"final"',
        }),
        abortMultipartUpload: vi.fn().mockResolvedValue(undefined),
    } satisfies CredentialStrategy
}

function makeFile(parts = 2): File {
    return new File([new ArrayBuffer(parts * PART)], 'big.zip', {
        type: 'application/zip',
    })
}

function upload(credentials: CredentialStrategy) {
    const strategy = new MultipartUpload({
        credentials,
        chunkSizeBytes: PART,
        maxConcurrentParts: 1,
        retryDelays: [0, 0, 0],
    })
    return strategy.upload(makeFile(2), unusedCredentials, {
        onProgress: vi.fn(),
        signal: new AbortController().signal,
    })
}

const { puts } = installXhrPartMock()

beforeEach(() => {
    puts.mockReset()
})

describe('a part PUT whose ETag response header cannot be read', () => {
    it('fails the upload with an error naming the ETag header and the bucket CORS setting, and never calls complete', async () => {
        const credentials = makeCredentials()
        // What a browser shows the page when CORS does not expose ETag: the
        // PUT succeeded, the header is not readable.
        puts.mockResolvedValue({ status: 200, headers: {} })

        const failure = await upload(credentials).catch((e: unknown) => e)

        expect(failure).toBeInstanceOf(UpupStorageError)
        expect(failure).toMatchObject({
            code: UpupErrorCode.CORS_ERROR,
            retryable: false,
            operation: 'upload',
        })
        expect((failure as Error).message).toMatch(/ETag/)
        expect((failure as Error).message).toMatch(
            /Access-Control-Expose-Headers|ExposeHeaders/,
        )
        expect(credentials.completeMultipartUpload).not.toHaveBeenCalled()
    })

    it('does not retry the part: the bucket setting will not change between attempts', async () => {
        puts.mockResolvedValue({ status: 200, headers: {} })

        await upload(makeCredentials()).catch(() => {
            // upup-catch: the rejection is asserted in the test above
        })

        expect(puts).toHaveBeenCalledTimes(1)
    })

    it('treats an empty ETag header the same as a missing one', async () => {
        const credentials = makeCredentials()
        puts.mockResolvedValue({ status: 200, headers: { ETag: '' } })

        await expect(upload(credentials)).rejects.toMatchObject({
            code: UpupErrorCode.CORS_ERROR,
        })
        expect(credentials.completeMultipartUpload).not.toHaveBeenCalled()
    })

    it('sends complete exactly the ETags storage returned when the header is readable', async () => {
        const credentials = makeCredentials()
        puts.mockImplementation(async (req: PartRequest) => ({
            status: 200,
            headers: { ETag: `"real-${/part(\d+)/.exec(req.url)?.[1]}"` },
        }))

        await upload(credentials)

        expect(credentials.completeMultipartUpload).toHaveBeenCalledWith({
            token: 'tok-abc',
            parts: [
                { partNumber: 1, eTag: '"real-1"' },
                { partNumber: 2, eTag: '"real-2"' },
            ],
        })
    })
})

describe('the whole-file retry loop and an unreadable ETag', () => {
    it('reports the failure after one attempt instead of re-uploading parts for every retry', async () => {
        const credentials = makeCredentials()
        puts.mockResolvedValue({ status: 200, headers: {} })
        const onFileError = vi.fn()
        const strategy = new MultipartUpload({
            credentials,
            chunkSizeBytes: PART,
            maxConcurrentParts: 1,
            retryDelays: [0],
        })
        const manager = new UploadManager({
            credentials,
            uploadStrategy: strategy,
            resolveUploadStrategy: () => ({
                uploadStrategy: strategy,
                presign: false,
            }),
            maxConcurrentUploads: 1,
            maxRetries: 3,
            onProgress: () => {},
            onFileComplete: () => {},
            onFileError,
        })
        const file = Object.assign(makeFile(2), {
            id: 'f1',
            key: null,
            metadata: {},
        }) as unknown as UploadFile

        await expect(manager.uploadAll([file])).rejects.toMatchObject({
            name: 'UpupUploadBatchError',
        })

        expect(credentials.initMultipartUpload).toHaveBeenCalledTimes(1)
        expect(puts).toHaveBeenCalledTimes(1)
        expect(onFileError).toHaveBeenCalledTimes(1)
        expect(onFileError.mock.calls[0]?.[1]).toMatchObject({
            code: UpupErrorCode.CORS_ERROR,
        })
    })
})
