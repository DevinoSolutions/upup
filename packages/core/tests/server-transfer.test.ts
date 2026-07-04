import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerTransfer } from '../src/strategies/server-transfer'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ServerTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the correct transfer endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          provider: 'google-drive',
          fileId: 'file-123',
          status: 'pending',
        }),
    })

    const transfer = new ServerTransfer({ serverUrl: 'https://api.example.com' })
    const result = await transfer.transfer('googleDrive', 'file-123')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/files/google-drive/transfer',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ fileId: 'file-123' }),
      }),
    )
    expect(result.fileId).toBe('file-123')
    expect(result.status).toBe('pending')
  })

  it('sends explicit auth headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ provider: 'dropbox', fileId: 'f1', status: 'ok' }),
    })

    const transfer = new ServerTransfer({
      serverUrl: 'https://api.example.com',
      headers: { 'x-api-key': 'key_abc' },
    })
    await transfer.transfer('dropbox', 'f1')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/files/dropbox/transfer'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'key_abc' }),
      }),
    )
  })

  it('passes optional fileName and token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ provider: 'onedrive', fileId: 'f2', status: 'ok' }),
    })

    const transfer = new ServerTransfer({ serverUrl: 'https://api.example.com' })
    await transfer.transfer('oneDrive', 'f2', {
      token: 'tok',
      fileName: 'report.docx',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/files/onedrive/transfer'),
      expect.objectContaining({
        body: JSON.stringify({ fileId: 'f2', fileName: 'report.docx', token: 'tok' }),
      }),
    )
  })

  it('throws on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve(''),
    })

    const transfer = new ServerTransfer({ serverUrl: 'https://api.example.com' })
    const err = await transfer.transfer('googleDrive', 'bad-file').catch(e => e)
    expect(err.status).toBe(500)
  })

  it('surfaces the server machine code on failure (P4/C6)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve(JSON.stringify({ error: 'Drive request failed', code: 'STORAGE_ERROR' })),
    })

    const transfer = new ServerTransfer({ serverUrl: 'https://api.example.com' })
    const err = await transfer.transfer('googleDrive', 'bad-file').catch(e => e)
    expect(err.code).toBe('STORAGE_ERROR')
  })
})
