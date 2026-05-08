import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupCore } from '../src/core'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('UpupCore hosted apiKey removal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not infer a managed serverUrl from apiKey-like legacy input', () => {
    const core = new UpupCore({ apiKey: 'key_abc123' } as any)
    expect(core.options.serverUrl).toBeUndefined()
  })

  it('does not upload through the retired managed apiKey path', async () => {
    const core = new UpupCore({ apiKey: 'key_abc123' } as any)
    await core.addFiles([new File(['data'], 'test.png', { type: 'image/png' })])

    await expect(core.upload()).rejects.toMatchObject({
      name: 'UpupConfigError',
      code: 'NO_UPLOAD_TARGET',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
