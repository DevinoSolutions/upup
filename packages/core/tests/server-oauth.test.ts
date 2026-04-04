import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerOAuth } from '../src/strategies/server-oauth'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ServerOAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the auth URL for a provider', async () => {
    const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
    const url = await oauth.getAuthUrl('google_drive')
    expect(url).toBe('https://api.example.com/auth/google-drive')
  })

  it('maps provider slugs correctly', async () => {
    const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
    expect(await oauth.getAuthUrl('onedrive')).toBe('https://api.example.com/auth/onedrive')
    expect(await oauth.getAuthUrl('dropbox')).toBe('https://api.example.com/auth/dropbox')
  })

  it('sends apiKey header on handleCallback', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'tok', refreshToken: 'ref' }),
    })

    const oauth = new ServerOAuth({
      serverUrl: 'https://api.example.com',
      apiKey: 'key_123',
    })
    await oauth.handleCallback('google_drive', { code: 'abc' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/google-drive/cb?code=abc'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'key_123' }),
      }),
    )
  })

  it('throws on failed callback', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
    await expect(
      oauth.handleCallback('google_drive', { code: 'bad' }),
    ).rejects.toThrow('OAuth callback failed')
  })

  it('lists files from server', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [{ id: '1', name: 'doc.pdf', mimeType: 'application/pdf', size: 100, isFolder: false }],
        }),
    })

    const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
    const files = await oauth.listFiles('dropbox', '/', 'token_abc')
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('doc.pdf')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/files/dropbox?path=%2F&token=token_abc'),
      expect.anything(),
    )
  })
})
