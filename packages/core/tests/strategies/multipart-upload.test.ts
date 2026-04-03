import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultipartUpload } from '../../src/strategies/multipart-upload'
import type {
  CredentialStrategy,
  MultipartInitResponse,
  MultipartSignPartResponse,
  MultipartCompleteResponse,
} from '@upup/shared'

describe('MultipartUpload', () => {
  const mockCredentials: CredentialStrategy = {
    getPresignedUrl: vi.fn(),
    initMultipartUpload: vi.fn(),
    signPart: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
  }

  const mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  let strategy: MultipartUpload

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new MultipartUpload({
      credentials: mockCredentials,
      chunkSizeBytes: 5 * 1024 * 1024, // 5 MiB
      maxConcurrentParts: 3,
    })
  })

  it('uploads a file in multiple parts', async () => {
    const fileSize = 12 * 1024 * 1024 // 12 MiB => 3 parts at 5 MiB chunk
    const file = new File([new ArrayBuffer(fileSize)], 'big.zip', {
      type: 'application/zip',
    })

    const initResponse: MultipartInitResponse = {
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
      partSize: 5 * 1024 * 1024,
      expiresIn: 3600,
    }
    vi.mocked(mockCredentials.initMultipartUpload!).mockResolvedValue(initResponse)

    vi.mocked(mockCredentials.signPart!).mockImplementation(async ({ partNumber }) => ({
      uploadUrl: `https://s3/part${partNumber}?signed`,
      expiresIn: 3600,
    }))

    mockFetch.mockImplementation(async (url: string, init: RequestInit) => ({
      ok: true,
      status: 200,
      headers: new Headers({ ETag: `"etag-${url.match(/part(\d)/)?.[1]}"` }),
    }))

    const completeResponse: MultipartCompleteResponse = {
      key: 'uploads/big.zip',
      publicUrl: 'https://cdn.example.com/big.zip',
      etag: '"final-etag"',
    }
    vi.mocked(mockCredentials.completeMultipartUpload!).mockResolvedValue(completeResponse)

    const onProgress = vi.fn()
    const result = await strategy.upload(file, {} as any, {
      onProgress,
      signal: new AbortController().signal,
    })

    expect(mockCredentials.initMultipartUpload).toHaveBeenCalledWith({
      name: 'big.zip',
      size: fileSize,
      type: 'application/zip',
    })
    expect(mockCredentials.signPart).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockCredentials.completeMultipartUpload).toHaveBeenCalledWith({
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
      parts: expect.arrayContaining([
        expect.objectContaining({ partNumber: 1 }),
        expect.objectContaining({ partNumber: 2 }),
        expect.objectContaining({ partNumber: 3 }),
      ]),
    })
    expect(result).toEqual({
      key: 'uploads/big.zip',
      publicUrl: 'https://cdn.example.com/big.zip',
      etag: '"final-etag"',
    })
    expect(onProgress).toHaveBeenCalled()
  })

  it('aborts multipart upload on signal abort', async () => {
    const file = new File([new ArrayBuffer(12 * 1024 * 1024)], 'big.zip', {
      type: 'application/zip',
    })
    const controller = new AbortController()

    vi.mocked(mockCredentials.initMultipartUpload!).mockResolvedValue({
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
      partSize: 5 * 1024 * 1024,
      expiresIn: 3600,
    })

    vi.mocked(mockCredentials.signPart!).mockImplementation(async () => {
      controller.abort()
      return { uploadUrl: 'https://s3/part?signed', expiresIn: 3600 }
    })

    mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    await expect(
      strategy.upload(file, {} as any, {
        onProgress: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toThrow()

    expect(mockCredentials.abortMultipartUpload).toHaveBeenCalledWith({
      key: 'uploads/big.zip',
      uploadId: 'upload-123',
    })
  })

  it('throws if credentials lack multipart methods', () => {
    const bareCredentials: CredentialStrategy = {
      getPresignedUrl: vi.fn(),
    }

    expect(
      () =>
        new MultipartUpload({
          credentials: bareCredentials,
          chunkSizeBytes: 5 * 1024 * 1024,
          maxConcurrentParts: 3,
        }),
    ).toThrow('CredentialStrategy must implement multipart methods')
  })
})
