import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { OneDrivePlugin } from '../src/drives/one-drive-plugin'
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
        id: 'item-abc123',
        name: 'test.txt',
        path: 'item-abc123',
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

describe('OneDrivePlugin', () => {
    let plugin: OneDrivePlugin
    let emitter: EventEmitter
    let events: Array<{ event: string; payload: unknown }>
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
        // Setup browser globals
        vi.stubGlobal('sessionStorage', mockSessionStorage)
        vi.stubGlobal('window', {
            location: { origin: 'https://example.com' },
            open: vi.fn(),
            screenX: 0,
            screenY: 0,
        })
        vi.stubGlobal('crypto', {
            getRandomValues: (arr: Uint8Array) => {
                for (let i = 0; i < arr.length; i++) arr[i] = i % 256
                return arr
            },
            subtle: {
                digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
            },
        })

        originalFetch = globalThis.fetch
        vi.stubGlobal('fetch', mockFetchResponse({}))

        sessionStore.clear()

        plugin = new OneDrivePlugin()
        emitter = new EventEmitter()
        events = captureEvents(emitter)

        plugin.configure({ onedrive_client_id: 'test-client-id' })
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
            expect(plugin.id).toBe('one-drive')
            expect(plugin.name).toBe('one-drive')
        })

        it('configure() stores config and returns this', () => {
            const fresh = new OneDrivePlugin()
            const result = fresh.configure({
                onedrive_client_id: 'abc',
                redirectUri: 'https://example.com/cb',
            })
            expect(result).toBe(fresh)
            expect(fresh.getConfig()).toEqual({
                onedrive_client_id: 'abc',
                redirectUri: 'https://example.com/cb',
            })
        })

        it('getConfig() returns the current config', () => {
            expect(plugin.getConfig()).toEqual({
                onedrive_client_id: 'test-client-id',
            })
        })

        it('init() sets the emitter', () => {
            plugin.signOut()
            const signedOutEvents = events.filter(
                e => e.event === 'onedrive:signed-out',
            )
            expect(signedOutEvents).toHaveLength(1)
        })

        it('destroy() clears the emitter', () => {
            plugin.destroy()
            plugin.signOut()
            const postDestroyEvents = events.filter(
                e => e.event === 'onedrive:signed-out',
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
    // Auth URL generation
    // ────────────────────────────────────────────

    describe('getAuthUrl()', () => {
        it('returns a valid Microsoft OAuth URL with PKCE params', async () => {
            const url = await plugin.getAuthUrl()

            expect(url).toContain(
                'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            )
            const parsed = new URL(url)
            expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
            expect(parsed.searchParams.get('response_type')).toBe('code')
            expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
            expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
            expect(parsed.searchParams.get('redirect_uri')).toBeTruthy()
            expect(parsed.searchParams.get('scope')).toContain('user.read')
            expect(parsed.searchParams.get('scope')).toContain(
                'files.readwrite.all',
            )
            expect(parsed.searchParams.get('scope')).toContain('offline_access')
            expect(parsed.searchParams.get('response_mode')).toBe('query')
        })

        it('uses configured redirectUri when provided', async () => {
            plugin.configure({
                onedrive_client_id: 'test-client-id',
                redirectUri: 'https://custom.com/callback',
            })

            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.searchParams.get('redirect_uri')).toBe(
                'https://custom.com/callback',
            )
        })

        it('falls back to window.location.origin + /od_redirect', async () => {
            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.searchParams.get('redirect_uri')).toBe(
                'https://example.com/od_redirect',
            )
        })

        it('throws if onedrive_client_id is not configured', async () => {
            plugin.configure({ onedrive_client_id: '' })
            await expect(plugin.getAuthUrl()).rejects.toThrow(
                'OneDrive client_id is not configured',
            )
        })
    })

    // ────────────────────────────────────────────
    // Token exchange (authenticate)
    // ────────────────────────────────────────────

    describe('authenticate()', () => {
        it('exchanges code for tokens and emits authenticated', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Token exchange
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'access-123',
                            refresh_token: 'refresh-456',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // User profile fetch (Graph /me)
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            displayName: 'Test User',
                            mail: 'test@example.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('auth-code-xyz')

            expect(plugin.getState()).toBe('authenticated')
            expect(plugin.isAuthenticated()).toBe(true)
            expect(plugin.getAccessToken()).toBe('access-123')

            const authEvents = events.filter(
                e => e.event === 'onedrive:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            expect(
                (authEvents[0].payload as { user: { name: string } }).user.name,
            ).toBe('Test User')

            // Tokens saved to session storage
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_onedrive_access_token',
                'access-123',
            )
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_onedrive_refresh_token',
                'refresh-456',
            )
        })

        it('emits state-change to authenticating then authenticated', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'tok',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            displayName: 'U',
                            mail: 'u@e.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')

            const stateChanges = events
                .filter(e => e.event === 'onedrive:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('authenticating')
            expect(stateChanges).toContain('authenticated')
        })

        it('throws if client_id not configured', async () => {
            plugin.configure({ onedrive_client_id: '' })
            await expect(plugin.authenticate('code')).rejects.toThrow(
                'OneDrive client_id is not configured',
            )
        })

        it('throws if getAuthUrl was not called first (no code verifier)', async () => {
            await expect(plugin.authenticate('code')).rejects.toThrow(
                'No PKCE code verifier',
            )
        })

        it('emits error and resets state on token exchange failure', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: vi.fn().mockResolvedValue({}),
                    text: vi.fn().mockResolvedValue('invalid_grant'),
                }),
            )

            await expect(plugin.authenticate('bad-code')).rejects.toThrow(
                'Token exchange failed',
            )

            expect(plugin.getState()).toBe('idle')

            const errorEvents = events.filter(
                e => e.event === 'onedrive:error',
            )
            expect(errorEvents).toHaveLength(1)
            expect(
                (errorEvents[0].payload as { action: string }).action,
            ).toBe('authenticate')
        })

        it('still authenticates if user profile fetch fails', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'tok',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Profile fetch fails
                    .mockRejectedValueOnce(new Error('network error')),
            )

            await plugin.authenticate('code')

            expect(plugin.getState()).toBe('authenticated')
            const authEvents = events.filter(
                e => e.event === 'onedrive:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            expect(
                (authEvents[0].payload as { user?: unknown }).user,
            ).toBeUndefined()
        })

        it('uses userPrincipalName when mail is absent', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'tok',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            displayName: 'User',
                            userPrincipalName: 'user@org.onmicrosoft.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')

            const authEvents = events.filter(
                e => e.event === 'onedrive:authenticated',
            )
            expect(
                (authEvents[0].payload as { user: { email: string } }).user.email,
            ).toBe('user@org.onmicrosoft.com')
        })
    })

    // ────────────────────────────────────────────
    // Token refresh
    // ────────────────────────────────────────────

    describe('refreshAccessToken()', () => {
        it('refreshes an expired token', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'old-token',
                            refresh_token: 'refresh-tok',
                            expires_in: 1,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            displayName: '',
                            mail: '',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')
            events.length = 0

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({
                        access_token: 'new-token',
                        expires_in: 3600,
                    }),
                    text: vi.fn().mockResolvedValue(''),
                }),
            )

            const result = await plugin.refreshAccessToken()

            expect(result).toBe('new-token')
            expect(plugin.getAccessToken()).toBe('new-token')
        })

        it('returns null if no client_id', async () => {
            plugin.configure({ onedrive_client_id: '' })
            const result = await plugin.refreshAccessToken()
            expect(result).toBeNull()
        })

        it('returns null if no refresh token', async () => {
            const result = await plugin.refreshAccessToken()
            expect(result).toBeNull()
        })

        it('emits session-expired and error on refresh failure', async () => {
            await plugin.getAuthUrl()

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'tok',
                            refresh_token: 'ref',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            displayName: '',
                            mail: '',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')
            events.length = 0

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: vi.fn().mockResolvedValue({}),
                    text: vi.fn().mockResolvedValue('invalid_grant'),
                }),
            )

            const result = await plugin.refreshAccessToken()

            expect(result).toBeNull()
            expect(plugin.getState()).toBe('session-expired')
            expect(plugin.getAccessToken()).toBeNull()

            const expired = events.filter(
                e => e.event === 'onedrive:session-expired',
            )
            expect(expired).toHaveLength(1)

            const errors = events.filter(e => e.event === 'onedrive:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('refreshAccessToken')
        })
    })

    // ────────────────────────────────────────────
    // Sign out
    // ────────────────────────────────────────────

    describe('signOut()', () => {
        it('clears tokens and emits signed-out', async () => {
            await plugin.getAuthUrl()
            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'tok',
                            refresh_token: 'ref',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            displayName: '',
                            mail: '',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )
            await plugin.authenticate('code')
            events.length = 0

            plugin.signOut()

            expect(plugin.getState()).toBe('idle')
            expect(plugin.isAuthenticated()).toBe(false)
            expect(plugin.getAccessToken()).toBeNull()

            const signedOut = events.filter(
                e => e.event === 'onedrive:signed-out',
            )
            expect(signedOut).toHaveLength(1)

            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_onedrive_access_token',
            )
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_onedrive_refresh_token',
            )
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_onedrive_token_expiry',
            )
        })

        it('emits state-change to idle', () => {
            plugin.signOut()
            const stateChanges = events.filter(
                e => e.event === 'onedrive:state-change',
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
            sessionStore.set('upup_onedrive_access_token', 'stored-token')
            sessionStore.set('upup_onedrive_refresh_token', 'stored-refresh')
            sessionStore.set(
                'upup_onedrive_token_expiry',
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

        it('restores even without refresh token', () => {
            sessionStore.set('upup_onedrive_access_token', 'token-only')

            const result = plugin.restoreSession()

            expect(result).toBe(true)
            expect(plugin.getAccessToken()).toBe('token-only')
        })

        it('emits state-change to authenticated', () => {
            sessionStore.set('upup_onedrive_access_token', 'tok')

            plugin.restoreSession()

            const stateChanges = events.filter(
                e => e.event === 'onedrive:state-change',
            )
            expect(stateChanges).toHaveLength(1)
            expect(
                (stateChanges[0].payload as { state: string }).state,
            ).toBe('authenticated')
        })
    })

    // ────────────────────────────────────────────
    // File listing (loadFiles)
    // ────────────────────────────────────────────

    describe('loadFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_onedrive_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('calls Graph API root and returns files', async () => {
            const graphItems = [
                {
                    id: 'file1',
                    name: 'document.pdf',
                    file: { mimeType: 'application/pdf' },
                    size: 1024,
                    lastModifiedDateTime: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'folder1',
                    name: 'Photos',
                    folder: { childCount: 5 },
                    size: 0,
                },
            ]

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ value: graphItems }),
            )

            const result = await plugin.loadFiles()

            expect(result.files).toHaveLength(2)
            expect(result.files[0].name).toBe('document.pdf')
            expect(result.files[0].mimeType).toBe('application/pdf')
            expect(result.files[0].isFolder).toBe(false)
            expect(result.files[0].size).toBe(1024)
            expect(result.files[1].name).toBe('Photos')
            expect(result.files[1].isFolder).toBe(true)
            expect(result.files[1].size).toBe(0)
            expect(result.folderId).toBe('root')
        })

        it('calls subfolder endpoint when folderId provided', async () => {
            const fetchMock = mockFetchResponse({ value: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles('folder-123')

            const calledUrl = fetchMock.mock.calls[0][0] as string
            expect(calledUrl).toContain('/me/drive/items/folder-123/children')
        })

        it('emits files-loaded event', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    value: [
                        {
                            id: '1',
                            name: 'test.txt',
                            file: { mimeType: 'text/plain' },
                            size: 10,
                        },
                    ],
                }),
            )

            await plugin.loadFiles('some-folder')

            const loaded = events.filter(
                e => e.event === 'onedrive:files-loaded',
            )
            expect(loaded).toHaveLength(1)
            const payload = loaded[0].payload as {
                files: DriveFile[]
                folderId: string
            }
            expect(payload.files).toHaveLength(1)
            expect(payload.folderId).toBe('some-folder')
        })

        it('transitions state to browsing then back to authenticated', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ value: [] }),
            )

            await plugin.loadFiles()

            const stateChanges = events
                .filter(e => e.event === 'onedrive:state-change')
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

            const errors = events.filter(e => e.event === 'onedrive:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadFiles')
        })

        it('throws when not authenticated', async () => {
            const fresh = new OneDrivePlugin()
            fresh.configure({ onedrive_client_id: 'id' })
            fresh.init(emitter)

            await expect(fresh.loadFiles()).rejects.toThrow(
                'Not authenticated',
            )
        })

        it('extracts thumbnail from thumbnails array', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    value: [
                        {
                            id: 'img1',
                            name: 'photo.jpg',
                            file: { mimeType: 'image/jpeg' },
                            size: 5000,
                            thumbnails: [
                                {
                                    medium: {
                                        url: 'https://thumb.example.com/medium.jpg',
                                    },
                                },
                            ],
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].thumbnail).toBe(
                'https://thumb.example.com/medium.jpg',
            )
        })
    })

    // ────────────────────────────────────────────
    // File download
    // ────────────────────────────────────────────

    describe('downloadFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_onedrive_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('downloads files and emits file-downloaded for each', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'id1', name: 'a.txt' }),
                makeDriveFile({ id: 'id2', name: 'b.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Item metadata for file 1 (get download URL)
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            '@microsoft.graph.downloadUrl':
                                'https://dl.onedrive.com/file1',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 1
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi.fn().mockResolvedValue(
                            new Blob(['content1'], { type: 'text/plain' }),
                        ),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Item metadata for file 2
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            '@microsoft.graph.downloadUrl':
                                'https://dl.onedrive.com/file2',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 2
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi.fn().mockResolvedValue(
                            new Blob(['content2'], { type: 'text/plain' }),
                        ),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(2)
            expect(results[0].name).toBe('a.txt')
            expect(results[1].name).toBe('b.txt')

            const downloaded = events.filter(
                e => e.event === 'onedrive:file-downloaded',
            )
            expect(downloaded).toHaveLength(2)
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
                makeDriveFile({ id: 'id1', name: 'fail.txt' }),
                makeDriveFile({ id: 'id2', name: 'ok.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Item metadata for file 1 - fails
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 500,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi.fn().mockResolvedValue('server error'),
                    })
                    // Item metadata for file 2 - succeeds
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            '@microsoft.graph.downloadUrl':
                                'https://dl.onedrive.com/file2',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 2
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi.fn().mockResolvedValue(
                            new Blob(['ok'], { type: 'text/plain' }),
                        ),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('ok.txt')

            const errors = events.filter(e => e.event === 'onedrive:error')
            expect(errors.length).toBeGreaterThanOrEqual(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('downloadFiles')
        })

        it('uses @content.downloadUrl as fallback', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'id1', name: 'alt.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            '@content.downloadUrl':
                                'https://dl.onedrive.com/alt',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi.fn().mockResolvedValue(
                            new Blob(['alt-content'], { type: 'text/plain' }),
                        ),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const results = await plugin.downloadFiles(driveFiles)
            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('alt.txt')
        })
    })

    // ────────────────────────────────────────────
    // getUserInfo
    // ────────────────────────────────────────────

    describe('getUserInfo()', () => {
        beforeEach(() => {
            sessionStore.set('upup_onedrive_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('fetches user profile from Graph API', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    displayName: 'John Doe',
                    mail: 'john@example.com',
                }),
            )

            const user = await plugin.getUserInfo()

            expect(user.name).toBe('John Doe')
            expect(user.email).toBe('john@example.com')
        })

        it('falls back to userPrincipalName when mail is null', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    displayName: 'Jane',
                    mail: null,
                    userPrincipalName: 'jane@org.onmicrosoft.com',
                }),
            )

            const user = await plugin.getUserInfo()
            expect(user.email).toBe('jane@org.onmicrosoft.com')
        })
    })

    // ────────────────────────────────────────────
    // API request auto-refresh (401 handling)
    // ────────────────────────────────────────────

    describe('API request 401 handling', () => {
        beforeEach(() => {
            sessionStore.set('upup_onedrive_access_token', 'expired-token')
            sessionStore.set('upup_onedrive_refresh_token', 'refresh-tok')
            sessionStore.set(
                'upup_onedrive_token_expiry',
                String(Date.now() + 3600_000),
            )
            plugin.restoreSession()
            events.length = 0
        })

        it('retries with refreshed token on 401', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // First attempt -> 401
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 401,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi.fn().mockResolvedValue('InvalidAuthenticationToken'),
                    })
                    // Refresh token call
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'refreshed-token',
                            expires_in: 3600,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Retry with new token
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            value: [],
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const result = await plugin.loadFiles()

            expect(result.files).toHaveLength(0)
            expect(plugin.getAccessToken()).toBe('refreshed-token')
        })

        it('emits session-expired when 401 and no refresh token', async () => {
            sessionStore.delete('upup_onedrive_refresh_token')
            plugin.restoreSession()
            events.length = 0

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    json: vi.fn().mockResolvedValue({}),
                    text: vi.fn().mockResolvedValue('InvalidAuthenticationToken'),
                }),
            )

            await expect(plugin.loadFiles()).rejects.toThrow()

            const expired = events.filter(
                e => e.event === 'onedrive:session-expired',
            )
            expect(expired.length).toBeGreaterThanOrEqual(1)

            const stateChanges = events
                .filter(e => e.event === 'onedrive:state-change')
                .map(e => (e.payload as { state: string }).state)
            expect(stateChanges).toContain('session-expired')
        })
    })

    // ────────────────────────────────────────────
    // MIME type guessing
    // ────────────────────────────────────────────

    describe('MIME type mapping (via loadFiles)', () => {
        beforeEach(() => {
            sessionStore.set('upup_onedrive_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it.each([
            ['photo.jpg', 'image/jpeg'],
            ['photo.jpeg', 'image/jpeg'],
            ['image.png', 'image/png'],
            ['anim.gif', 'image/gif'],
            ['pic.webp', 'image/webp'],
            ['icon.svg', 'image/svg+xml'],
            ['doc.pdf', 'application/pdf'],
            ['report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            ['data.csv', 'text/csv'],
            ['unknown.xyz', 'application/octet-stream'],
        ])('maps %s to %s', async (filename, expectedMime) => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    value: [
                        {
                            id: '1',
                            name: filename,
                            file: {}, // no mimeType in file object
                            size: 100,
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].mimeType).toBe(expectedMime)
        })

        it('uses file.mimeType from Graph when available', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    value: [
                        {
                            id: '1',
                            name: 'custom.bin',
                            file: { mimeType: 'application/x-custom' },
                            size: 100,
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].mimeType).toBe('application/x-custom')
        })

        it('maps folders with mimeType folder', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    value: [
                        {
                            id: 'f1',
                            name: 'MyFolder',
                            folder: { childCount: 0 },
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].mimeType).toBe('folder')
            expect(result.files[0].size).toBe(0)
        })
    })

    // ────────────────────────────────────────────
    // Edge cases
    // ────────────────────────────────────────────

    describe('edge cases', () => {
        it('loadFiles defaults folderId to root', async () => {
            sessionStore.set('upup_onedrive_access_token', 'tok')
            plugin.restoreSession()

            const fetchMock = mockFetchResponse({ value: [] })
            vi.stubGlobal('fetch', fetchMock)

            const result = await plugin.loadFiles()

            const calledUrl = fetchMock.mock.calls[0][0] as string
            expect(calledUrl).toContain('/me/drive/root/children')
            expect(result.folderId).toBe('root')
        })

        it('mapGraphItem handles missing fields gracefully', async () => {
            sessionStore.set('upup_onedrive_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    value: [
                        {
                            // Missing most fields
                            file: {},
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles()
            expect(result.files[0].id).toBe('')
            expect(result.files[0].name).toBe('')
        })

        it('handles empty value array', async () => {
            sessionStore.set('upup_onedrive_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ value: [] }),
            )

            const result = await plugin.loadFiles()
            expect(result.files).toHaveLength(0)
        })

        it('handles missing value key in response', async () => {
            sessionStore.set('upup_onedrive_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({}),
            )

            const result = await plugin.loadFiles()
            expect(result.files).toHaveLength(0)
        })
    })
})
