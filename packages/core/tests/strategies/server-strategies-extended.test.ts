import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServerOAuth } from '../../src/strategies/server-oauth'
import { ServerTransfer } from '../../src/strategies/server-transfer'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => vi.clearAllMocks())

// ─────────────────────────────────────────────
// ServerOAuth — constructor edge cases
// ─────────────────────────────────────────────
describe('ServerOAuth — constructor', () => {
    it('strips trailing slash from serverUrl', async () => {
        const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com/' })
        const url = await oauth.getAuthUrl('dropbox')
        expect(url).toBe('https://api.example.com/auth/dropbox')
    })

    it('includes custom headers on requests', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ files: [] }),
        })
        const oauth = new ServerOAuth({
            serverUrl: 'https://api.example.com',
            headers: { 'X-Custom': 'hello' },
        })
        await oauth.listFiles('dropbox', '/', 'tok')
        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({ 'X-Custom': 'hello' }),
            }),
        )
    })
})

// ─────────────────────────────────────────────
// ServerOAuth — getFileMetadata
// ─────────────────────────────────────────────
describe('ServerOAuth — getFileMetadata', () => {
    it('calls the correct endpoint and returns metadata', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    id: 'f1',
                    name: 'photo.jpg',
                    mimeType: 'image/jpeg',
                    size: 5000,
                    isFolder: false,
                }),
        })
        const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
        const meta = await oauth.getFileMetadata('googleDrive', 'f1', 'tok')

        expect(meta.name).toBe('photo.jpg')
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/files/google-drive?fileId=f1&token=tok'),
            expect.any(Object),
        )
    })

    it('throws on failed metadata request', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            text: () => Promise.resolve(''),
        })
        const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
        const err = await oauth.getFileMetadata('dropbox', 'bad', 'tok').catch(e => e)
        expect(err.status).toBe(404)
    })
})

// ─────────────────────────────────────────────
// ServerOAuth — listFiles edge cases
// ─────────────────────────────────────────────
describe('ServerOAuth — listFiles edge cases', () => {
    it('returns empty array when response has no files key', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        })
        const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
        const files = await oauth.listFiles('oneDrive', '/', 'tok')
        expect(files).toEqual([])
    })

    it('throws on failed list request', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            text: () => Promise.resolve(''),
        })
        const oauth = new ServerOAuth({ serverUrl: 'https://api.example.com' })
        const err = await oauth.listFiles('dropbox', '/', 'tok').catch(e => e)
        expect(err.status).toBe(403)
    })
})

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
