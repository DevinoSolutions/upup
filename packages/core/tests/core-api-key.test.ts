import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupCore } from '../src/core'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('UpupCore apiKey wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets serverUrl to managed endpoint when apiKey is provided', () => {
    const core = new UpupCore({ apiKey: 'key_abc123' })
    expect(core.options.serverUrl).toBe('https://api.upup.dev/v1')
  })

  it('does not override explicit serverUrl when apiKey is also provided', () => {
    const core = new UpupCore({
      apiKey: 'key_abc123',
      serverUrl: 'https://custom.example.com/upload',
    })
    expect(core.options.serverUrl).toBe('https://custom.example.com/upload')
  })

  it('upload() uses ServerCredentials with apiKey header when apiKey is set', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          key: 'test.png',
          publicUrl: 'https://cdn/test.png',
          uploadUrl: 'https://s3/test.png?signed',
          expiresIn: 3600,
        }),
    })

    const core = new UpupCore({ apiKey: 'key_abc123' })
    const file = new File(['data'], 'test.png', { type: 'image/png' })
    await core.addFiles([file])

    // Trigger upload - it should use ServerCredentials
    // We verify the fetch was called with the managed URL + api key header
    await core.upload()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.upup.dev/v1/presign',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'key_abc123',
        }),
      }),
    )
  })
})
