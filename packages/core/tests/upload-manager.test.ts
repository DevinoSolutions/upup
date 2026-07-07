import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploadManager, type UploadManagerOptions } from '../src/upload-manager'
import type {
    CredentialStrategy,
    UploadStrategy,
} from '../src/contracts-strategies'
import type { UploadFile } from '@upup/core'

// Helper to create a minimal UploadFile using a plain object
function makeFile(id: string, name: string): UploadFile {
    return {
        id,
        name,
        size: 5,
        type: 'text/plain',
        key: null,
        lastModified: Date.now(),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        text: () => Promise.resolve('hello'),
        stream: () => new ReadableStream(),
        slice: () => new Blob(),
        webkitRelativePath: '',
    } as unknown as UploadFile
}

const mockPresignedUrl = {
    key: 'uploads/test.txt',
    publicUrl: 'https://cdn.example.com/uploads/test.txt',
    uploadUrl: 'https://s3.example.com/upload',
    expiresIn: 3600,
}

const mockUploadResult = {
    key: 'uploads/test.txt',
    publicUrl: 'https://cdn.example.com/uploads/test.txt',
}

describe('UploadManager', () => {
    let mockCredentials: CredentialStrategy
    let mockUploadStrategy: UploadStrategy
    let onProgress: ReturnType<typeof vi.fn>
    let onFileComplete: ReturnType<typeof vi.fn>
    let onFileError: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockCredentials = {
            getPresignedUrl: vi.fn().mockResolvedValue(mockPresignedUrl),
        } as unknown as CredentialStrategy

        mockUploadStrategy = {
            upload: vi.fn().mockResolvedValue(mockUploadResult),
        }

        onProgress = vi.fn()
        onFileComplete = vi.fn()
        onFileError = vi.fn()
    })

    function makeManager(
        overrides: Partial<UploadManagerOptions> = {},
    ): UploadManager {
        return new UploadManager({
            credentials: mockCredentials,
            uploadStrategy: mockUploadStrategy,
            maxConcurrentUploads: 2,
            onProgress:
                onProgress as unknown as UploadManagerOptions['onProgress'],
            onFileComplete:
                onFileComplete as unknown as UploadManagerOptions['onFileComplete'],
            onFileError: onFileError as unknown as NonNullable<
                UploadManagerOptions['onFileError']
            >,
            ...overrides,
        })
    }

    it('uploads all files and calls onFileComplete for each', async () => {
        const manager = makeManager()
        const files = [
            makeFile('f1', 'a.txt'),
            makeFile('f2', 'b.txt'),
            makeFile('f3', 'c.txt'),
        ]

        const results = await manager.uploadAll(files)

        expect(results).toHaveLength(3)
        expect(onFileComplete).toHaveBeenCalledTimes(3)
        expect(mockCredentials.getPresignedUrl).toHaveBeenCalledTimes(3)
        expect(mockUploadStrategy.upload).toHaveBeenCalledTimes(3)
    })

    it('calls onFileComplete with the file and result', async () => {
        const manager = makeManager()
        const files = [makeFile('f1', 'a.txt')]

        await manager.uploadAll(files)

        expect(onFileComplete).toHaveBeenCalledWith(files[0], mockUploadResult)
    })

    it('respects maxConcurrentUploads', async () => {
        let activeConcurrent = 0
        let maxObserved = 0

        const slowUpload = vi.fn().mockImplementation(async () => {
            activeConcurrent++
            maxObserved = Math.max(maxObserved, activeConcurrent)
            await new Promise(r => setTimeout(r, 10))
            activeConcurrent--
            return mockUploadResult
        })

        const manager = makeManager({
            maxConcurrentUploads: 2,
            uploadStrategy: { upload: slowUpload },
        })

        const files = [
            makeFile('f1', 'a.txt'),
            makeFile('f2', 'b.txt'),
            makeFile('f3', 'c.txt'),
            makeFile('f4', 'd.txt'),
        ]

        await manager.uploadAll(files)

        expect(maxObserved).toBeLessThanOrEqual(2)
        expect(slowUpload).toHaveBeenCalledTimes(4)
    })

    it('aborts all uploads when abort() is called', async () => {
        let resolveUpload!: () => void
        const pendingUpload = new Promise<typeof mockUploadResult>(resolve => {
            resolveUpload = () => resolve(mockUploadResult)
        })

        const abortSpy = vi.fn()
        const abortableUpload = vi
            .fn()
            .mockImplementation(
                (
                    _file: File | Blob,
                    _creds: unknown,
                    opts: { signal: AbortSignal },
                ) => {
                    opts.signal.addEventListener('abort', abortSpy)
                    return pendingUpload
                },
            )

        const manager = makeManager({
            maxConcurrentUploads: 1,
            uploadStrategy: { upload: abortableUpload },
        })

        const files = [makeFile('f1', 'a.txt')]
        const uploadPromise = manager.uploadAll(files)

        // Give upload a tick to start
        await new Promise(r => setTimeout(r, 0))
        manager.abort()

        // Resolve so the promise settles
        resolveUpload()
        await uploadPromise.catch(() => {})

        expect(abortSpy).toHaveBeenCalled()
    })

    it('retries on retryable UpupNetworkError', async () => {
        const { UpupNetworkError } = await import('@upup/core')

        let callCount = 0
        const flakyUpload = vi.fn().mockImplementation(async () => {
            callCount++
            if (callCount < 3) {
                throw new UpupNetworkError('Temporary failure', 503)
            }
            return mockUploadResult
        })

        const manager = makeManager({
            maxRetries: 3,
            uploadStrategy: { upload: flakyUpload },
        })

        const files = [makeFile('f1', 'a.txt')]
        const results = await manager.uploadAll(files)

        expect(results).toHaveLength(1)
        expect(flakyUpload).toHaveBeenCalledTimes(3)
    })

    it('calls onFileError, completes other files, then throws a batch error', async () => {
        const { UpupNetworkError } = await import('@upup/core')

        let callIdx = 0
        const partialFailUpload = vi.fn().mockImplementation(async () => {
            callIdx++
            if (callIdx === 1) {
                throw new UpupNetworkError('Permanent failure', 400)
            }
            return mockUploadResult
        })

        const manager = makeManager({
            maxRetries: 0,
            uploadStrategy: { upload: partialFailUpload },
        })

        const files = [makeFile('f1', 'a.txt'), makeFile('f2', 'b.txt')]
        await expect(manager.uploadAll(files)).rejects.toMatchObject({
            name: 'UpupUploadBatchError',
            errors: expect.arrayContaining([
                expect.objectContaining({ file: files[0] }),
            ]),
        })

        expect(onFileError).toHaveBeenCalledTimes(1)
        expect(onFileComplete).toHaveBeenCalledTimes(1)
    })

    it('can skip presign when a resolver selects a self-contained strategy', async () => {
        const uploadWithoutPresign = vi.fn().mockResolvedValue(mockUploadResult)
        const manager = makeManager({
            resolveUploadStrategy: () => ({
                uploadStrategy: { upload: uploadWithoutPresign },
                presign: false,
            }),
        })

        await manager.uploadAll([makeFile('f1', 'a.txt')])

        expect(mockCredentials.getPresignedUrl).not.toHaveBeenCalled()
        expect(uploadWithoutPresign).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ uploadUrl: '' }),
            expect.anything(),
        )
    })

    it('uses isSuccessfulCall for custom success detection', async () => {
        const isSuccessfulCall = vi.fn().mockResolvedValue(true)

        const manager = makeManager({ isSuccessfulCall })
        const files = [makeFile('f1', 'a.txt')]

        await manager.uploadAll(files)

        expect(isSuccessfulCall).toHaveBeenCalledTimes(1)
        expect(onFileComplete).toHaveBeenCalledTimes(1)
    })

    it('throws when isSuccessfulCall returns false', async () => {
        const isSuccessfulCall = vi.fn().mockResolvedValue(false)

        const manager = makeManager({ isSuccessfulCall, maxRetries: 0 })
        const files = [makeFile('f1', 'a.txt')]

        await expect(manager.uploadAll(files)).rejects.toMatchObject({
            name: 'UpupUploadBatchError',
            errors: expect.arrayContaining([
                expect.objectContaining({ file: files[0] }),
            ]),
        })

        expect(onFileError).toHaveBeenCalledTimes(1)
        expect(onFileComplete).toHaveBeenCalledTimes(0)
    })

    it('calls onProgress during upload', async () => {
        const uploadWithProgress = vi.fn().mockImplementation(
            async (
                _file: File | Blob,
                _creds: unknown,
                opts: {
                    onProgress: (loaded: number, total: number) => void
                },
            ) => {
                opts.onProgress(50, 100)
                opts.onProgress(100, 100)
                return mockUploadResult
            },
        )

        const manager = makeManager({
            uploadStrategy: { upload: uploadWithProgress },
        })
        const files = [makeFile('f1', 'a.txt')]

        await manager.uploadAll(files)

        expect(onProgress).toHaveBeenCalledWith('f1', 50, 100)
        expect(onProgress).toHaveBeenCalledWith('f1', 100, 100)
    })
})
