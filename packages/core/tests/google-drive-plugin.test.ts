import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { GoogleDrivePlugin } from '../src/drives/google-drive-plugin'
import type { DriveFile } from '../src/drives/types'

// ── Helpers ──

function captureEvents(emitter: EventEmitter) {
    const events: Array<{ event: string; payload: unknown }> = []
    const originalEmit = emitter.emit.bind(emitter)
    emitter.emit = (event: string, payload?: unknown) => {
        events.push({ event, payload })
        return originalEmit(event, payload)
    }
    return events
}

function mockFetchResponse(
    body: unknown,
    status = 200,
    ok = true,
): ReturnType<typeof vi.fn> {
    return vi.fn().mockResolvedValue({
        ok,
        status,
        json: vi.fn().mockResolvedValue(body),
        text: vi.fn().mockResolvedValue(
            typeof body === 'string' ? body : JSON.stringify(body),
        ),
        blob: vi.fn().mockResolvedValue(
            new Blob(['file-content'], { type: 'text/plain' }),
        ),
    })
}

function makeDriveFile(overrides: Partial<DriveFile> = {}): DriveFile {
    return {
        id: 'file-abc123',
        name: 'test.txt',
        path: '',
        size: 100,
        mimeType: 'text/plain',
        isFolder: false,
        ...overrides,
    }
}

// ── Mock browser globals ──

const sessionStore = new Map<string, string>()

const mockSessionStorage = {
    getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
        sessionStore.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
        sessionStore.delete(key)
    }),
    clear: vi.fn(() => sessionStore.clear()),
    get length() {
        return sessionStore.size
    },
    key: vi.fn((_i: number) => null),
}

describe('GoogleDrivePlugin', () => {
    let plugin: GoogleDrivePlugin
    let emitter: EventEmitter
    let events: Array<{ event: string; payload: unknown }>
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
        // Setup browser globals
        vi.stubGlobal('sessionStorage', mockSessionStorage)
        vi.stubGlobal('window', {
            location: { origin: 'https://example.com' },
        })

        originalFetch = globalThis.fetch
        vi.stubGlobal('fetch', mockFetchResponse({}))

        sessionStore.clear()

        plugin = new GoogleDrivePlugin()
        emitter = new EventEmitter()
        events = captureEvents(emitter)

        plugin.configure({
            apiKey: 'test-api-key',
            appId: 'test-app-id',
            clientId: 'test-client-id',
        })
        plugin.init(emitter)
    })

    afterEach(() => {
        plugin.destroy()
        vi.stubGlobal('fetch', originalFetch)
        vi.restoreAllMocks()
    })

    // ────────────────────────────────────────────
    // Construction & Configuration
    // ────────────────────────────────────────────

    describe('construction and configuration', () => {
        it('has correct id and name', () => {
            expect(plugin.id).toBe('google-drive')
            expect(plugin.name).toBe('google-drive')
        })

        it('configure() stores config and returns this', () => {
            const fresh = new GoogleDrivePlugin()
            const result = fresh.configure({
                apiKey: 'key',
                appId: 'app',
                clientId: 'client',
            })
            expect(result).toBe(fresh)
            expect(fresh.getConfig()).toEqual({
                apiKey: 'key',
                appId: 'app',
                clientId: 'client',
            })
        })

        it('getConfig() returns the current config', () => {
            expect(plugin.getConfig()).toEqual({
                apiKey: 'test-api-key',
                appId: 'test-app-id',
                clientId: 'test-client-id',
            })
        })

        it('init() sets the emitter', () => {
            // Verify by calling signOut which emits events
            plugin.signOut()
            const signedOutEvents = events.filter(
                e => e.event === 'google-drive:signed-out',
            )
            expect(signedOutEvents).toHaveLength(1)
        })

        it('destroy() clears the emitter', () => {
            plugin.destroy()
            // After destroy, signOut should NOT emit
            plugin.signOut()
            const postDestroyEvents = events.filter(
                e => e.event === 'google-drive:signed-out',
            )
            expect(postDestroyEvents).toHaveLength(0)
        })

        it('setup() is a no-op', () => {
            expect(() => plugin.setup({})).not.toThrow()
        })
    })

    // ────────────────────────────────────────────
    // State management
    // ────────────────────────────────────────────

    describe('state management', () => {
        it('initial state is idle', () => {
            expect(plugin.getState()).toBe('idle')
        })

        it('isAuthenticated() returns false when idle', () => {
            expect(plugin.isAuthenticated()).toBe(false)
        })

        it('getAccessToken() returns null initially', () => {
            expect(plugin.getAccessToken()).toBeNull()
        })
    })

    // ────────────────────────────────────────────
    // setAccessToken
    // ────────────────────────────────────────────

    describe('setAccessToken()', () => {
        it('stores token and transitions to authenticated', () => {
            plugin.setAccessToken('my-token', 3600)

            expect(plugin.getAccessToken()).toBe('my-token')
            expect(plugin.getState()).toBe('authenticated')
            expect(plugin.isAuthenticated()).toBe(true)
        })

        it('saves token to sessionStorage', () => {
            plugin.setAccessToken('my-token', 3600)

            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_gdrive_access_token',
                'my-token',
            )
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_gdrive_token_expiry',
                expect.any(String),
            )
        })

        it('emits state-change to authenticated', () => {
            plugin.setAccessToken('tok')

            const stateChanges = events.filter(
                e => e.event === 'google-drive:state-change',
            )
            expect(stateChanges).toHaveLength(1)
            expect(
                (stateChanges[0].payload as { state: string }).state,
            ).toBe('authenticated')
        })

        it('works without expiresIn', () => {
            plugin.setAccessToken('tok')
            expect(plugin.getAccessToken()).toBe('tok')
            expect(plugin.isAuthenticated()).toBe(true)
        })
    })

    // ────────────────────────────────────────────
    // authenticate (token + user info)
    // ────────────────────────────────────────────

    describe('authenticate()', () => {
        it('sets token and fetches user info', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    name: 'Test User',
                    email: 'test@example.com',
                    picture: 'https://photo.url',
                }),
            )

            await plugin.authenticate('access-token-123', 3600)

            expect(plugin.getState()).toBe('authenticated')
            expect(plugin.isAuthenticated()).toBe(true)
            expect(plugin.getAccessToken()).toBe('access-token-123')

            const authEvents = events.filter(
                e => e.event === 'google-drive:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            const payload = authEvents[0].payload as {
                user: { name: string; email: string; picture: string }
            }
            expect(payload.user.name).toBe('Test User')
            expect(payload.user.email).toBe('test@example.com')
            expect(payload.user.picture).toBe('https://photo.url')
        })

        it('emits state-change to authenticating then authenticated', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    name: 'U',
                    email: 'u@e.com',
                }),
            )

            await plugin.authenticate('tok')

            const stateChanges = events
                .filter(e => e.event === 'google-drive:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('authenticating')
            expect(stateChanges).toContain('authenticated')
        })

        it('still authenticates if user profile fetch fails', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockRejectedValue(new Error('network error')),
            )

            await plugin.authenticate('tok')

            expect(plugin.getState()).toBe('authenticated')
            const authEvents = events.filter(
                e => e.event === 'google-drive:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            expect(
                (authEvents[0].payload as { user?: unknown }).user,
            ).toBeUndefined()
        })
    })

    // ────────────────────────────────────────────
    // Sign out
    // ────────────────────────────────────────────

    describe('signOut()', () => {
        it('clears tokens and emits signed-out', () => {
            plugin.setAccessToken('tok', 3600)
            events.length = 0

            plugin.signOut()

            expect(plugin.getState()).toBe('idle')
            expect(plugin.isAuthenticated()).toBe(false)
            expect(plugin.getAccessToken()).toBeNull()

            const signedOut = events.filter(
                e => e.event === 'google-drive:signed-out',
            )
            expect(signedOut).toHaveLength(1)
        })

        it('clears session storage', () => {
            plugin.setAccessToken('tok', 3600)
            vi.mocked(sessionStorage.removeItem).mockClear()

            plugin.signOut()

            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_gdrive_access_token',
            )
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_gdrive_token_expiry',
            )
        })

        it('emits state-change to idle', () => {
            plugin.signOut()
            const stateChanges = events.filter(
                e => e.event === 'google-drive:state-change',
            )
            expect(stateChanges).toHaveLength(1)
            expect(
                (stateChanges[0].payload as { state: string }).state,
            ).toBe('idle')
        })
    })

    // ────────────────────────────────────────────
    // Session restore
    // ────────────────────────────────────────────

    describe('restoreSession()', () => {
        it('restores session from sessionStorage', () => {
            sessionStore.set('upup_gdrive_access_token', 'stored-token')
            sessionStore.set(
                'upup_gdrive_token_expiry',
                String(Date.now() + 3600_000),
            )

            const result = plugin.restoreSession()

            expect(result).toBe(true)
            expect(plugin.getState()).toBe('authenticated')
            expect(plugin.isAuthenticated()).toBe(true)
            expect(plugin.getAccessToken()).toBe('stored-token')
        })

        it('returns false when no stored token', () => {
            const result = plugin.restoreSession()
            expect(result).toBe(false)
            expect(plugin.getState()).toBe('idle')
        })

        it('restores without expiry', () => {
            sessionStore.set('upup_gdrive_access_token', 'token-only')

            const result = plugin.restoreSession()

            expect(result).toBe(true)
            expect(plugin.getAccessToken()).toBe('token-only')
        })

        it('returns false and emits session-expired for expired token', () => {
            sessionStore.set('upup_gdrive_access_token', 'expired-token')
            sessionStore.set(
                'upup_gdrive_token_expiry',
                String(Date.now() - 1000), // Already expired
            )

            const result = plugin.restoreSession()

            expect(result).toBe(false)
            expect(plugin.getAccessToken()).toBeNull()

            const expired = events.filter(
                e => e.event === 'google-drive:session-expired',
            )
            expect(expired).toHaveLength(1)

            const stateChanges = events
                .filter(e => e.event === 'google-drive:state-change')
                .map(e => (e.payload as { state: string }).state)
            expect(stateChanges).toContain('session-expired')
        })

        it('emits state-change to authenticated', () => {
            sessionStore.set('upup_gdrive_access_token', 'tok')

            plugin.restoreSession()

            const stateChanges = events.filter(
                e => e.event === 'google-drive:state-change',
            )
            expect(stateChanges).toHaveLength(1)
            expect(
                (stateChanges[0].payload as { state: string }).state,
            ).toBe('authenticated')
        })
    })

    // ────────────────────────────────────────────
    // User info
    // ────────────────────────────────────────────

    describe('getUserInfo()', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('fetches and returns user profile', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    name: 'John Doe',
                    email: 'john@example.com',
                    picture: 'https://photo.url/pic.jpg',
                }),
            )

            const user = await plugin.getUserInfo()

            expect(user.name).toBe('John Doe')
            expect(user.email).toBe('john@example.com')
            expect(user.picture).toBe('https://photo.url/pic.jpg')
        })

        it('calls correct API endpoint with auth header', async () => {
            const fetchMock = mockFetchResponse({
                name: '',
                email: '',
            })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.getUserInfo()

            expect(fetchMock).toHaveBeenCalledWith(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Headers),
                }),
            )

            const headers = fetchMock.mock.calls[0][1].headers as Headers
            expect(headers.get('Authorization')).toBe('Bearer valid-token')
        })

        it('handles missing fields gracefully', async () => {
            vi.stubGlobal('fetch', mockFetchResponse({}))

            const user = await plugin.getUserInfo()

            expect(user.name).toBe('')
            expect(user.email).toBe('')
            expect(user.picture).toBeUndefined()
        })
    })

    // ────────────────────────────────────────────
    // File listing (loadFiles)
    // ────────────────────────────────────────────

    describe('loadFiles()', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('calls Drive API and returns files', async () => {
            const driveEntries = [
                {
                    id: 'file1',
                    name: 'document.pdf',
                    mimeType: 'application/pdf',
                    size: '1024',
                    thumbnailLink: 'https://thumb.url',
                },
                {
                    id: 'folder1',
                    name: 'Photos',
                    mimeType: 'application/vnd.google-apps.folder',
                },
            ]

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ files: driveEntries }),
            )

            const result = await plugin.loadFiles()

            expect(result.files).toHaveLength(2)
            expect(result.files[0].name).toBe('document.pdf')
            expect(result.files[0].mimeType).toBe('application/pdf')
            expect(result.files[0].isFolder).toBe(false)
            expect(result.files[0].size).toBe(1024)
            expect(result.files[0].thumbnail).toBe('https://thumb.url')
            expect(result.files[1].name).toBe('Photos')
            expect(result.files[1].isFolder).toBe(true)
            expect(result.files[1].mimeType).toBe('folder')
            expect(result.folderId).toBe('root')
        })

        it('uses provided folderId', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)

            const result = await plugin.loadFiles('folder-xyz')

            expect(result.folderId).toBe('folder-xyz')

            // Check the query parameter
            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain('folder-xyz')
        })

        it('defaults to root folder', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            const url = fetchMock.mock.calls[0][0] as string
            const parsed = new URL(url)
            const q = parsed.searchParams.get('q')
            expect(q).toContain("'root' in parents")
        })

        it('includes api_key in request', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain('key=test-api-key')
        })

        it('emits files-loaded event', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [
                        {
                            id: '1',
                            name: 'test.txt',
                            mimeType: 'text/plain',
                            size: '10',
                        },
                    ],
                }),
            )

            await plugin.loadFiles('my-folder')

            const loaded = events.filter(
                e => e.event === 'google-drive:files-loaded',
            )
            expect(loaded).toHaveLength(1)
            const payload = loaded[0].payload as {
                files: DriveFile[]
                folderId: string
            }
            expect(payload.files).toHaveLength(1)
            expect(payload.folderId).toBe('my-folder')
        })

        it('transitions state to browsing then back to authenticated', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ files: [] }),
            )

            await plugin.loadFiles()

            const stateChanges = events
                .filter(e => e.event === 'google-drive:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('browsing')
            expect(stateChanges[stateChanges.length - 1]).toBe('authenticated')
        })

        it('emits error on API failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('server error', 500, false),
            )

            await expect(plugin.loadFiles()).rejects.toThrow()

            const errors = events.filter(
                e => e.event === 'google-drive:error',
            )
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadFiles')
        })

        it('throws when not authenticated', async () => {
            const fresh = new GoogleDrivePlugin()
            fresh.configure({
                apiKey: 'key',
                appId: 'app',
                clientId: 'client',
            })
            fresh.init(emitter)

            await expect(fresh.loadFiles()).rejects.toThrow(
                'Not authenticated',
            )
        })

        it('handles empty files array', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ files: [] }),
            )

            const result = await plugin.loadFiles()
            expect(result.files).toHaveLength(0)
        })

        it('handles missing fields in entries gracefully', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [{ id: 'x' }], // Missing name, mimeType, size
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].id).toBe('x')
            expect(result.files[0].name).toBe('')
            expect(result.files[0].size).toBe(0)
        })
    })

    // ────────────────────────────────────────────
    // File download (regular files)
    // ────────────────────────────────────────────

    describe('downloadFiles() - regular files', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('downloads files and returns them as File objects', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'f1', name: 'a.txt' }),
                makeDriveFile({ id: 'f2', name: 'b.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Download file 1
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi
                            .fn()
                            .mockResolvedValue(
                                new Blob(['content1'], { type: 'text/plain' }),
                            ),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 2
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi
                            .fn()
                            .mockResolvedValue(
                                new Blob(['content2'], { type: 'text/plain' }),
                            ),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(2)
            expect(results[0].name).toBe('a.txt')
            expect(results[1].name).toBe('b.txt')
        })

        it('uses correct download URL with alt=media', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'file-123', name: 'doc.pdf' }),
            ]

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                blob: vi
                    .fn()
                    .mockResolvedValue(
                        new Blob(['pdf'], { type: 'application/pdf' }),
                    ),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.downloadFiles(driveFiles)

            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain(
                'https://www.googleapis.com/drive/v3/files/file-123',
            )
            expect(url).toContain('alt=media')
            expect(url).toContain('key=test-api-key')
        })

        it('skips folders', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'folder1',
                    name: 'MyFolder',
                    isFolder: true,
                }),
            ]

            const results = await plugin.downloadFiles(driveFiles)
            expect(results).toHaveLength(0)
        })

        it('continues downloading remaining files on individual failure', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'f1', name: 'fail.txt' }),
                makeDriveFile({ id: 'f2', name: 'ok.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // File 1 - fails
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 500,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi.fn().mockResolvedValue('server error'),
                    })
                    // File 2 - succeeds
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi
                            .fn()
                            .mockResolvedValue(
                                new Blob(['ok'], { type: 'text/plain' }),
                            ),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('ok.txt')

            const errors = events.filter(
                e => e.event === 'google-drive:error',
            )
            expect(errors.length).toBeGreaterThanOrEqual(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('downloadFiles')
        })
    })

    // ────────────────────────────────────────────
    // File download (Google Workspace files)
    // ────────────────────────────────────────────

    describe('downloadFiles() - Workspace export', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('exports Google Docs as .docx', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'doc-id',
                    name: 'My Document',
                    mimeType: 'application/vnd.google-apps.document',
                }),
            ]

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                blob: vi.fn().mockResolvedValue(
                    new Blob(['docx-content'], {
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    }),
                ),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('My Document.docx')
            expect(results[0].type).toBe(
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )

            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain(
                'https://docs.google.com/document/d/doc-id/export?format=docx',
            )
        })

        it('exports Google Sheets as .xlsx', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'sheet-id',
                    name: 'My Sheet.gsheet',
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                }),
            ]

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                blob: vi.fn().mockResolvedValue(
                    new Blob(['xlsx-content'], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    }),
                ),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('My Sheet.xlsx')

            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain(
                'https://docs.google.com/spreadsheets/d/sheet-id/export?format=xlsx',
            )
        })

        it('exports Google Slides as .pptx', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'slide-id',
                    name: 'My Presentation',
                    mimeType: 'application/vnd.google-apps.presentation',
                }),
            ]

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                blob: vi.fn().mockResolvedValue(
                    new Blob(['pptx-content'], {
                        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    }),
                ),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('My Presentation.pptx')

            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain(
                'https://docs.google.com/presentation/d/slide-id/export?format=pptx',
            )
        })

        it('exports Google Drawings as .png', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'draw-id',
                    name: 'My Drawing',
                    mimeType: 'application/vnd.google-apps.drawing',
                }),
            ]

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                blob: vi.fn().mockResolvedValue(
                    new Blob(['png-content'], { type: 'image/png' }),
                ),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('My Drawing.png')
            expect(results[0].type).toBe('image/png')

            const url = fetchMock.mock.calls[0][0] as string
            expect(url).toContain(
                'https://docs.google.com/drawings/d/draw-id/export?format=png',
            )
        })

        it('strips existing extension before adding export extension', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'doc-id',
                    name: 'Document.gdoc',
                    mimeType: 'application/vnd.google-apps.document',
                }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    status: 200,
                    blob: vi.fn().mockResolvedValue(new Blob(['content'])),
                    text: vi.fn().mockResolvedValue(''),
                }),
            )

            const results = await plugin.downloadFiles(driveFiles)
            expect(results[0].name).toBe('Document.docx')
        })
    })

    // ────────────────────────────────────────────
    // downloadFile (single)
    // ────────────────────────────────────────────

    describe('downloadFile()', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('downloads a regular file', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    status: 200,
                    blob: vi.fn().mockResolvedValue(
                        new Blob(['data'], { type: 'application/pdf' }),
                    ),
                    text: vi.fn().mockResolvedValue(''),
                }),
            )

            const file = await plugin.downloadFile(
                makeDriveFile({
                    id: 'f1',
                    name: 'report.pdf',
                    mimeType: 'application/pdf',
                }),
            )

            expect(file).not.toBeNull()
            expect(file!.name).toBe('report.pdf')
        })

        it('exports a workspace file', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    status: 200,
                    blob: vi.fn().mockResolvedValue(new Blob(['docx'])),
                    text: vi.fn().mockResolvedValue(''),
                }),
            )

            const file = await plugin.downloadFile(
                makeDriveFile({
                    id: 'doc1',
                    name: 'Notes',
                    mimeType: 'application/vnd.google-apps.document',
                }),
            )

            expect(file).not.toBeNull()
            expect(file!.name).toBe('Notes.docx')
        })
    })

    // ────────────────────────────────────────────
    // API request 401 handling
    // ────────────────────────────────────────────

    describe('API request 401 handling', () => {
        beforeEach(() => {
            plugin.setAccessToken('expired-token', 3600)
            events.length = 0
        })

        it('emits session-expired on 401', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 401,
                    json: vi.fn().mockResolvedValue({}),
                    text: vi.fn().mockResolvedValue('Token expired'),
                }),
            )

            await expect(plugin.loadFiles()).rejects.toThrow()

            const expired = events.filter(
                e => e.event === 'google-drive:session-expired',
            )
            expect(expired.length).toBeGreaterThanOrEqual(1)

            const stateChanges = events
                .filter(e => e.event === 'google-drive:state-change')
                .map(e => (e.payload as { state: string }).state)
            expect(stateChanges).toContain('session-expired')
        })

        it('clears tokens on 401', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 401,
                    json: vi.fn().mockResolvedValue({}),
                    text: vi.fn().mockResolvedValue('Unauthorized'),
                }),
            )

            await expect(plugin.loadFiles()).rejects.toThrow()

            // loadFiles catch resets to authenticated, but the token
            // should have been cleared by apiRequest
            expect(plugin.getAccessToken()).toBeNull()
        })
    })

    // ────────────────────────────────────────────
    // Token expiry (ensureValidToken)
    // ────────────────────────────────────────────

    describe('token expiry check', () => {
        it('throws when token has expired', async () => {
            // Set a token that already expired
            plugin.setAccessToken('tok', -1) // expiresIn = -1 => already expired

            await expect(plugin.loadFiles()).rejects.toThrow(
                'Access token has expired',
            )

            const expired = events.filter(
                e => e.event === 'google-drive:session-expired',
            )
            expect(expired.length).toBeGreaterThanOrEqual(1)
        })

        it('works fine with non-expired token', async () => {
            plugin.setAccessToken('tok', 3600) // 1 hour from now

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ files: [] }),
            )

            const result = await plugin.loadFiles()
            expect(result.files).toHaveLength(0)
        })
    })

    // ────────────────────────────────────────────
    // Google entry mapping
    // ────────────────────────────────────────────

    describe('Google entry mapping (via loadFiles)', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('maps folder entries correctly', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [
                        {
                            id: 'folder1',
                            name: 'MyFolder',
                            mimeType: 'application/vnd.google-apps.folder',
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].isFolder).toBe(true)
            expect(result.files[0].mimeType).toBe('folder')
            expect(result.files[0].size).toBe(0)
        })

        it('maps file entries with size', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [
                        {
                            id: 'file1',
                            name: 'photo.jpg',
                            mimeType: 'image/jpeg',
                            size: '2048',
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].isFolder).toBe(false)
            expect(result.files[0].mimeType).toBe('image/jpeg')
            expect(result.files[0].size).toBe(2048)
        })

        it('maps workspace file entries', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [
                        {
                            id: 'doc1',
                            name: 'Report',
                            mimeType: 'application/vnd.google-apps.document',
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].isFolder).toBe(false)
            expect(result.files[0].mimeType).toBe(
                'application/vnd.google-apps.document',
            )
        })

        it('preserves thumbnail link', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [
                        {
                            id: 'f1',
                            name: 'img.png',
                            mimeType: 'image/png',
                            size: '100',
                            thumbnailLink: 'https://thumb.example.com/img',
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].thumbnail).toBe(
                'https://thumb.example.com/img',
            )
        })
    })
})
