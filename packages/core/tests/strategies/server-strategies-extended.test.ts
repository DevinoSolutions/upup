import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerTransfer } from '../../src/strategies/server-transfer'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => vi.clearAllMocks())

// ─────────────────────────────────────────────
// ServerTransfer — constructor edge cases
// ─────────────────────────────────────────────
describe('ServerTransfer — constructor', () => {
    it('strips trailing slash from serverUrl', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ provider: 'dropbox', fileId: 'f1', status: 'ok' }),
        })
        const transfer = new ServerTransfer({ serverUrl: 'https://api.example.com/' })
        await transfer.transfer('dropbox', 'f1')
        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.example.com/files/dropbox/transfer',
            expect.any(Object),
        )
    })

    it('includes custom headers on requests', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ provider: 'onedrive', fileId: 'f1', status: 'ok' }),
        })
        const transfer = new ServerTransfer({
            serverUrl: 'https://api.example.com',
            headers: { 'X-Tenant': 'acme' },
        })
        await transfer.transfer('oneDrive', 'f1')
        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({ 'X-Tenant': 'acme' }),
            }),
        )
    })

    it('maps googleDrive to google-drive slug', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ provider: 'google-drive', fileId: 'g1', status: 'ok' }),
        })
        const transfer = new ServerTransfer({ serverUrl: 'https://api.example.com' })
        await transfer.transfer('googleDrive', 'g1')
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/files/google-drive/transfer'),
            expect.any(Object),
        )
    })
})
