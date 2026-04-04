import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TokenEndpointCredentials } from '../src/strategies/token-endpoint'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('TokenEndpointCredentials', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('calls the endpoint with file metadata and returns presigned URL', async () => {
    const presignedResponse = {
      url: 'https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abc',
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      key: 'uploads/test.jpg',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => presignedResponse,
    })
    const strategy = new TokenEndpointCredentials({ url: '/api/upload' })
    const result = await strategy.getPresignedUrl({
      name: 'test.jpg',
      size: 1024,
      type: 'image/jpeg',
    })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(result.url).toBe(presignedResponse.url)
    expect(result.key).toBe(presignedResponse.key)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })
    const strategy = new TokenEndpointCredentials({ url: '/api/upload' })
    await expect(
      strategy.getPresignedUrl({
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
      }),
    ).rejects.toThrow()
  })
})
