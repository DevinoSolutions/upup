// Contract: a refusal is reported once, not after the retry budget is spent.
//
// A 4xx is the other side's answer to this exact request — a server
// `onBeforeUpload` hook refusing a file over the plan limit, an expired
// signature, a denied key. Sending the same request again gets the same
// answer. The retry loop only recognized that for `UpupNetworkError`; the
// errors server mode actually produces for /presign and /multipart/init are
// `UpupStorageError`s, so a 403 was sent four times (with backoff) before
// `onError` fired. 408 and 429 are the two 4xx answers that do ask for another
// attempt, and 5xx and network-level failures stay retryable.

import { describe, it, expect, vi } from 'vitest'
import { UploadManager, type UploadManagerOptions } from '../src/upload-manager'
import type {
    CredentialStrategy,
    UploadStrategy,
} from '../src/contracts-strategies'
import { uploadErrorFromResponse, type UploadFile } from '@useupup/core'

function makeFile(): UploadFile {
    return {
        id: 'f1',
        name: 'a.txt',
        size: 5,
        type: 'text/plain',
        key: null,
        metadata: {},
    } as unknown as UploadFile
}

const presigned = {
    key: 'uploads/a.txt',
    uploadUrl: 'https://s3.example.com/upload',
    expiresIn: 3600,
}
const uploaded = { key: 'uploads/a.txt' }

/** The error `ServerCredentials` throws for a non-2xx from `@useupup/server`. */
function serverRefusal(
    status: number,
    operation: 'presign' | 'multipart-init',
    body = '{"error":"File exceeds your plan\'s 200MB limit.","code":"FILE_TOO_LARGE"}',
) {
    return uploadErrorFromResponse({
        status,
        statusText: '',
        body,
        kind: 'storage',
        operation,
    })
}

function makeManager(
    getPresignedUrl: CredentialStrategy['getPresignedUrl'],
    upload: UploadStrategy['upload'],
    onFileError = vi.fn(),
) {
    const options: UploadManagerOptions = {
        credentials: { getPresignedUrl },
        uploadStrategy: { upload },
        maxConcurrentUploads: 1,
        maxRetries: 3,
        onProgress: () => {},
        onFileComplete: () => {},
        onFileError,
    }
    return new UploadManager(options)
}

describe('UploadManager — refusals are not retried', () => {
    it('reports a 403 presign refusal after one request, with the server message intact', async () => {
        const getPresignedUrl = vi
            .fn()
            .mockRejectedValue(serverRefusal(403, 'presign'))
        const onFileError = vi.fn()
        const manager = makeManager(getPresignedUrl, vi.fn(), onFileError)

        await expect(manager.uploadAll([makeFile()])).rejects.toMatchObject({
            name: 'UpupUploadBatchError',
        })

        expect(getPresignedUrl).toHaveBeenCalledTimes(1)
        expect(onFileError).toHaveBeenCalledTimes(1)
        expect(onFileError.mock.calls[0]?.[1]).toMatchObject({
            message: "File exceeds your plan's 200MB limit.",
            code: 'FILE_TOO_LARGE',
            status: 403,
        })
    })

    it('reports a 403 multipart-init refusal thrown by the upload strategy after one attempt', async () => {
        const upload = vi
            .fn()
            .mockRejectedValue(serverRefusal(403, 'multipart-init'))
        const manager = makeManager(
            vi.fn().mockResolvedValue(presigned),
            upload,
        )

        await expect(manager.uploadAll([makeFile()])).rejects.toMatchObject({
            name: 'UpupUploadBatchError',
        })

        expect(upload).toHaveBeenCalledTimes(1)
    })

    it.each([400, 401, 404, 413, 415, 422])(
        'does not retry a %i from the server',
        async status => {
            const getPresignedUrl = vi
                .fn()
                .mockRejectedValue(serverRefusal(status, 'presign'))
            const manager = makeManager(getPresignedUrl, vi.fn())

            await expect(manager.uploadAll([makeFile()])).rejects.toThrow()

            expect(getPresignedUrl).toHaveBeenCalledTimes(1)
        },
    )

    it.each([408, 429, 500, 503])(
        'still retries a %i: the server asked for another attempt or failed on its own side',
        async status => {
            const getPresignedUrl = vi
                .fn()
                .mockRejectedValueOnce(serverRefusal(status, 'presign', ''))
                .mockResolvedValue(presigned)
            const upload = vi.fn().mockResolvedValue(uploaded)
            const manager = makeManager(getPresignedUrl, upload)

            await expect(manager.uploadAll([makeFile()])).resolves.toEqual([
                uploaded,
            ])

            expect(getPresignedUrl).toHaveBeenCalledTimes(2)
        },
    )

    it('still retries a network-level failure that carries no HTTP status', async () => {
        const upload = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(uploaded)
        const manager = makeManager(
            vi.fn().mockResolvedValue(presigned),
            upload,
        )

        await expect(manager.uploadAll([makeFile()])).resolves.toEqual([
            uploaded,
        ])

        expect(upload).toHaveBeenCalledTimes(2)
    })
})
