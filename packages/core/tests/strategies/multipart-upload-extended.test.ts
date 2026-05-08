import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultipartUpload } from '../../src/strategies/multipart-upload'
import type { CredentialStrategy } from '@upup/core'

function makeCredentials(): CredentialStrategy {
    return {
        getPresignedUrl: vi.fn(),
        initMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/file.bin',
            uploadId: 'up-1',
            partSize: 5 * 1024 * 1024,
            expiresIn: 3600,
        }),
        signPart: vi.fn().mockImplementation(async ({ partNumber }) => ({
            uploadUrl: `https://s3/part${partNumber}?signed`,
            expiresIn: 3600,
        })),
        completeMultipartUpload: vi.fn().mockResolvedValue({
            key: 'uploads/file.bin',
            publicUrl: 'https://cdn/file.bin',
            etag: '"done"',
        }),
        abortMultipartUpload: vi.fn(),
    }
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"etag"' }),
    }))
})

describe('MultipartUpload — extended', () => {
    it('uploads a file smaller than chunk size as a single part', async () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({
            credentials: creds,
            chunkSizeBytes: 10 * 1024 * 1024,
        })
        const file = new File([new ArrayBuffer(1024)], 'tiny.txt', { type: 'text/plain' })

        await strategy.upload(file, {} as any, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(creds.signPart).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('uses default chunk size when not specified', () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({ credentials: creds })
        // Should not throw — defaults are applied
        expect((strategy as any).chunkSizeBytes).toBe(5 * 1024 * 1024)
    })

    it('uses default maxConcurrentParts when not specified', () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({ credentials: creds })
        expect((strategy as any).maxConcurrentParts).toBe(3)
    })

    it('respects custom chunkSizeBytes', () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({
            credentials: creds,
            chunkSizeBytes: 1024,
        })
        expect((strategy as any).chunkSizeBytes).toBe(1024)
    })

    it('respects custom maxConcurrentParts', () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({
            credentials: creds,
            maxConcurrentParts: 8,
        })
        expect((strategy as any).maxConcurrentParts).toBe(8)
    })

    it('calls onProgress during upload', async () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({
            credentials: creds,
            chunkSizeBytes: 5 * 1024 * 1024,
        })
        const fileSize = 12 * 1024 * 1024
        const file = new File([new ArrayBuffer(fileSize)], 'big.bin', { type: 'application/octet-stream' })
        const onProgress = vi.fn()

        await strategy.upload(file, {} as any, {
            onProgress,
            signal: new AbortController().signal,
        })

        expect(onProgress).toHaveBeenCalled()
        // Last progress call should have loaded close to total
        const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
        expect(lastCall[0]).toBeGreaterThan(0) // loaded > 0
        expect(lastCall[1]).toBe(fileSize) // total = file size
    })

    it('throws when a part upload returns non-ok response', async () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({
            credentials: creds,
            chunkSizeBytes: 5 * 1024 * 1024,
        })
        const file = new File([new ArrayBuffer(6 * 1024 * 1024)], 'fail.bin')

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers(),
        })

        await expect(
            strategy.upload(file, {} as any, {
                onProgress: vi.fn(),
                signal: new AbortController().signal,
            }),
        ).rejects.toThrow()
    })

    it('returns the complete response as UploadResult', async () => {
        const creds = makeCredentials()
        const strategy = new MultipartUpload({ credentials: creds })
        const file = new File([new ArrayBuffer(1024)], 'result.txt')

        const result = await strategy.upload(file, {} as any, {
            onProgress: vi.fn(),
            signal: new AbortController().signal,
        })

        expect(result).toEqual({
            key: 'uploads/file.bin',
            publicUrl: 'https://cdn/file.bin',
            etag: '"done"',
        })
    })
})
