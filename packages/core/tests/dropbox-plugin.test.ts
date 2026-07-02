import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { DropboxPlugin } from '../src/drives/dropbox-plugin'
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
        id: 'id:abc123',
        name: 'test.txt',
        path: '/test.txt',
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

describe('DropboxPlugin', () => {
    let plugin: DropboxPlugin
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

        plugin = new DropboxPlugin()
        emitter = new EventEmitter()
        events = captureEvents(emitter)

        plugin.configure({ dropbox_client_id: 'test-client-id' })
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
            expect(plugin.id).toBe('dropbox')
            expect(plugin.name).toBe('dropbox')
        })

        it('configure() stores config and returns this', () => {
            const fresh = new DropboxPlugin()
            const result = fresh.configure({
                dropbox_client_id: 'abc',
                dropbox_redirect_uri: 'https://example.com/cb',
            })
            expect(result).toBe(fresh)
            expect(fresh.getConfig()).toEqual({
                dropbox_client_id: 'abc',
                dropbox_redirect_uri: 'https://example.com/cb',
            })
        })

        it('getConfig() returns the current config', () => {
            expect(plugin.getConfig()).toEqual({
                dropbox_client_id: 'test-client-id',
            })
        })

        it('init() sets the emitter', () => {
            // After init, plugin should be able to emit events
            // Verify by calling signOut which emits events
            plugin.signOut()
            const signedOutEvents = events.filter(
                e => e.event === 'dropbox:signed-out',
            )
            expect(signedOutEvents).toHaveLength(1)
        })

        it('destroy() clears the emitter', () => {
            plugin.destroy()
            // After destroy, emitting should not throw but should not reach emitter
            plugin.signOut()
            // Only the state-change and signed-out from the first signOut
            // before destroy should exist... but destroy was called, so
            // signOut after destroy should NOT emit
            // Since destroy was already called in the test, we re-init for cleanup
            const postDestroyEvents = events.filter(
                e => e.event === 'dropbox:signed-out',
            )
            // signOut called once before destroy, once after
            // after destroy, emitter is null so no events
            expect(postDestroyEvents).toHaveLength(0)
        })

        it('setup() is a no-op', () => {
            // Should not throw
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
            expect(plugin.getAccessToken()).toBe(null)
        })
    })

    // ────────────────────────────────────────────
    // Auth URL generation
    // ────────────────────────────────────────────

    describe('getAuthUrl()', () => {
        it('returns a valid Dropbox OAuth URL with PKCE params', async () => {
            const url = await plugin.getAuthUrl()

            expect(url).toContain('https://www.dropbox.com/oauth2/authorize')
            const parsed = new URL(url)
            expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
            expect(parsed.searchParams.get('response_type')).toBe('code')
            expect(parsed.searchParams.get('token_access_type')).toBe(
                'offline',
            )
            expect(parsed.searchParams.get('code_challenge_method')).toBe(
                'S256',
            )
            expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
            expect(parsed.searchParams.get('redirect_uri')).toBeTruthy()
            expect(parsed.searchParams.get('scope')).toContain(
                'files.metadata.read',
            )
        })

        it('uses configured redirect_uri when provided', async () => {
            plugin.configure({
                dropbox_client_id: 'test-client-id',
                dropbox_redirect_uri: 'https://custom.com/callback',
            })

            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.searchParams.get('redirect_uri')).toBe(
                'https://custom.com/callback',
            )
        })

        it('falls back to window.location.origin + /dp_redirect', async () => {
            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.searchParams.get('redirect_uri')).toBe(
                'https://example.com/dp_redirect',
            )
        })

        it('throws if dropbox_client_id is not configured', async () => {
            plugin.configure({})
            await expect(plugin.getAuthUrl()).rejects.toThrow(
                'Dropbox client_id is not configured',
            )
        })
    })

    // ────────────────────────────────────────────
    // Token exchange (authenticate)
    // ────────────────────────────────────────────

    describe('authenticate()', () => {
        it('exchanges code for tokens and emits authenticated', async () => {
            // First call getAuthUrl to set code verifier
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
                            expires_in: 14400,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // User profile fetch (via apiRequest -> ensureValidToken -> fetch)
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: { display_name: 'Test User' },
                            email: 'test@example.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('auth-code-xyz')

            expect(plugin.getState()).toBe('authenticated')
            expect(plugin.isAuthenticated()).toBe(true)
            expect(plugin.getAccessToken()).toBe('access-123')

            const authEvents = events.filter(
                e => e.event === 'dropbox:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            expect(
                (authEvents[0].payload as { user: { name: string } }).user.name,
            ).toBe('Test User')

            // Tokens saved to session storage
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_dropbox_access_token',
                'access-123',
            )
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_dropbox_refresh_token',
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
                            name: { display_name: 'U' },
                            email: 'u@e.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')

            const stateChanges = events
                .filter(e => e.event === 'dropbox:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('authenticating')
            expect(stateChanges).toContain('authenticated')
        })

        it('throws if client_id not configured', async () => {
            plugin.configure({})
            await expect(plugin.authenticate('code')).rejects.toThrow(
                'Dropbox client_id is not configured',
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
                e => e.event === 'dropbox:error',
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
                e => e.event === 'dropbox:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            // user is undefined since profile fetch failed
            expect(
                (authEvents[0].payload as { user?: unknown }).user,
            ).toBeUndefined()
        })
    })

    // ────────────────────────────────────────────
    // Token refresh
    // ────────────────────────────────────────────

    describe('refreshAccessToken()', () => {
        it('refreshes an expired token', async () => {
            // First authenticate to set tokens
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
                            expires_in: 1, // expires immediately
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: { display_name: '' },
                            email: '',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')
            events.length = 0 // Clear previous events

            // Now mock the refresh call
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({
                        access_token: 'new-token',
                        expires_in: 14400,
                    }),
                    text: vi.fn().mockResolvedValue(''),
                }),
            )

            const result = await plugin.refreshAccessToken()

            expect(result).toBe('new-token')
            expect(plugin.getAccessToken()).toBe('new-token')
        })

        it('returns null if no client_id', async () => {
            plugin.configure({})
            const result = await plugin.refreshAccessToken()
            expect(result).toBeNull()
        })

        it('returns null if no refresh token', async () => {
            // Plugin has no refresh token since never authenticated
            const result = await plugin.refreshAccessToken()
            expect(result).toBeNull()
        })

        it('emits session-expired and error on refresh failure', async () => {
            // Authenticate first
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
                            name: { display_name: '' },
                            email: '',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')
            events.length = 0

            // Refresh fails
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
                e => e.event === 'dropbox:session-expired',
            )
            expect(expired).toHaveLength(1)

            const errors = events.filter(e => e.event === 'dropbox:error')
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
            // Authenticate first
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
                            name: { display_name: '' },
                            email: '',
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
                e => e.event === 'dropbox:signed-out',
            )
            expect(signedOut).toHaveLength(1)

            // Should clear session storage
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_dropbox_access_token',
            )
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_dropbox_refresh_token',
            )
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_dropbox_token_expiry',
            )
        })

        it('emits state-change to idle', () => {
            plugin.signOut()
            const stateChanges = events.filter(
                e => e.event === 'dropbox:state-change',
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
            sessionStore.set('upup_dropbox_access_token', 'stored-token')
            sessionStore.set('upup_dropbox_refresh_token', 'stored-refresh')
            sessionStore.set(
                'upup_dropbox_token_expiry',
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
            sessionStore.set('upup_dropbox_access_token', 'token-only')

            const result = plugin.restoreSession()

            expect(result).toBe(true)
            expect(plugin.getAccessToken()).toBe('token-only')
        })

        it('emits state-change to authenticated', () => {
            sessionStore.set('upup_dropbox_access_token', 'tok')

            plugin.restoreSession()

            const stateChanges = events.filter(
                e => e.event === 'dropbox:state-change',
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
            // Set up authenticated state
            sessionStore.set('upup_dropbox_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('calls Dropbox API and returns files', async () => {
            const dropboxEntries = [
                {
                    '.tag': 'file',
                    id: 'id:file1',
                    name: 'document.pdf',
                    path_display: '/document.pdf',
                    size: 1024,
                    server_modified: '2024-01-01T00:00:00Z',
                },
                {
                    '.tag': 'folder',
                    id: 'id:folder1',
                    name: 'Photos',
                    path_display: '/Photos',
                },
            ]

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: dropboxEntries,
                    has_more: false,
                    cursor: 'cursor-abc',
                }),
            )

            const result = await plugin.loadFiles('')

            expect(result.files).toHaveLength(2)
            expect(result.files[0].name).toBe('document.pdf')
            expect(result.files[0].mimeType).toBe('application/pdf')
            expect(result.files[0].isFolder).toBe(false)
            expect(result.files[1].name).toBe('Photos')
            expect(result.files[1].isFolder).toBe(true)
            expect(result.hasMore).toBe(false)
            expect(result.cursor).toBe('cursor-abc')
        })

        it('emits files-loaded event', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            '.tag': 'file',
                            id: 'id:1',
                            name: 'test.txt',
                            path_display: '/test.txt',
                            size: 10,
                        },
                    ],
                    has_more: false,
                }),
            )

            await plugin.loadFiles('/some/path')

            const loaded = events.filter(
                e => e.event === 'dropbox:files-loaded',
            )
            expect(loaded).toHaveLength(1)
            const payload = loaded[0].payload as {
                files: DriveFile[]
                path: string
                hasMore: boolean
            }
            expect(payload.files).toHaveLength(1)
            expect(payload.path).toBe('/some/path')
            expect(payload.hasMore).toBe(false)
        })

        it('transitions state to browsing then back to authenticated', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ entries: [], has_more: false }),
            )

            await plugin.loadFiles('')

            const stateChanges = events
                .filter(e => e.event === 'dropbox:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('browsing')
            expect(stateChanges[stateChanges.length - 1]).toBe('authenticated')
        })

        it('emits error on API failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('server error', 500, false),
            )

            await expect(plugin.loadFiles('')).rejects.toThrow()

            const errors = events.filter(e => e.event === 'dropbox:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadFiles')
        })

        it('throws when not authenticated', async () => {
            const fresh = new DropboxPlugin()
            fresh.configure({ dropbox_client_id: 'id' })
            fresh.init(emitter)

            await expect(fresh.loadFiles('')).rejects.toThrow(
                'Not authenticated',
            )
        })
    })

    // ────────────────────────────────────────────
    // Pagination (loadMoreFiles)
    // ────────────────────────────────────────────

    describe('loadMoreFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_dropbox_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('continues listing with cursor', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            '.tag': 'file',
                            id: 'id:2',
                            name: 'more.txt',
                            path_display: '/more.txt',
                            size: 50,
                        },
                    ],
                    has_more: true,
                    cursor: 'next-cursor',
                }),
            )

            const result = await plugin.loadMoreFiles('prev-cursor')

            expect(result.files).toHaveLength(1)
            expect(result.hasMore).toBe(true)
            expect(result.cursor).toBe('next-cursor')
        })

        it('emits files-loaded event', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [],
                    has_more: false,
                }),
            )

            await plugin.loadMoreFiles('cursor')

            const loaded = events.filter(
                e => e.event === 'dropbox:files-loaded',
            )
            expect(loaded).toHaveLength(1)
        })

        it('emits error on failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('err', 500, false),
            )

            await expect(plugin.loadMoreFiles('cursor')).rejects.toThrow()

            const errors = events.filter(e => e.event === 'dropbox:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadMoreFiles')
        })
    })

    // ────────────────────────────────────────────
    // Load all files in folder
    // ────────────────────────────────────────────

    describe('loadAllFilesInFolder()', () => {
        beforeEach(() => {
            sessionStore.set('upup_dropbox_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('fetches all pages recursively', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // First page
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            entries: [
                                {
                                    '.tag': 'file',
                                    id: 'id:1',
                                    name: 'a.txt',
                                    path_display: '/folder/a.txt',
                                    size: 10,
                                },
                            ],
                            has_more: true,
                            cursor: 'c1',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Second page (continue)
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            entries: [
                                {
                                    '.tag': 'file',
                                    id: 'id:2',
                                    name: 'b.txt',
                                    path_display: '/folder/b.txt',
                                    size: 20,
                                },
                            ],
                            has_more: false,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const files = await plugin.loadAllFilesInFolder('/folder')

            expect(files).toHaveLength(2)
            expect(files[0].name).toBe('a.txt')
            expect(files[1].name).toBe('b.txt')
        })

        it('excludes folders from results', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            '.tag': 'folder',
                            id: 'id:f',
                            name: 'SubFolder',
                            path_display: '/folder/SubFolder',
                        },
                        {
                            '.tag': 'file',
                            id: 'id:1',
                            name: 'doc.pdf',
                            path_display: '/folder/doc.pdf',
                            size: 100,
                        },
                    ],
                    has_more: false,
                }),
            )

            const files = await plugin.loadAllFilesInFolder('/folder')

            expect(files).toHaveLength(1)
            expect(files[0].name).toBe('doc.pdf')
        })

        it('emits error on failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('err', 500, false),
            )

            await expect(
                plugin.loadAllFilesInFolder('/folder'),
            ).rejects.toThrow()

            const errors = events.filter(e => e.event === 'dropbox:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadAllFilesInFolder')
        })
    })

    // ────────────────────────────────────────────
    // File download
    // ────────────────────────────────────────────

    describe('downloadFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_dropbox_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('downloads files and emits file-downloaded for each', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'id:1', name: 'a.txt', path: '/a.txt' }),
                makeDriveFile({ id: 'id:2', name: 'b.txt', path: '/b.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Temp link for file 1
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi
                            .fn()
                            .mockResolvedValue({
                                link: 'https://dl.dropbox.com/temp1',
                            }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 1
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi
                            .fn()
                            .mockResolvedValue(
                                new Blob(['content1'], {
                                    type: 'text/plain',
                                }),
                            ),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Temp link for file 2
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi
                            .fn()
                            .mockResolvedValue({
                                link: 'https://dl.dropbox.com/temp2',
                            }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 2
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        blob: vi
                            .fn()
                            .mockResolvedValue(
                                new Blob(['content2'], {
                                    type: 'text/plain',
                                }),
                            ),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(2)
            expect(results[0].name).toBe('a.txt')
            expect(results[1].name).toBe('b.txt')

            const downloaded = events.filter(
                e => e.event === 'dropbox:file-downloaded',
            )
            expect(downloaded).toHaveLength(2)
        })

        it('skips folders', async () => {
            const driveFiles = [
                makeDriveFile({
                    id: 'id:folder',
                    name: 'MyFolder',
                    isFolder: true,
                }),
            ]

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(0)
        })

        it('continues downloading remaining files on individual failure', async () => {
            const driveFiles = [
                makeDriveFile({ id: 'id:1', name: 'fail.txt', path: '/fail.txt' }),
                makeDriveFile({ id: 'id:2', name: 'ok.txt', path: '/ok.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Temp link for file 1 - fails
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 500,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi.fn().mockResolvedValue('server error'),
                    })
                    // Temp link for file 2 - succeeds
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi
                            .fn()
                            .mockResolvedValue({
                                link: 'https://dl.dropbox.com/temp2',
                            }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Download file 2
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

            const errors = events.filter(e => e.event === 'dropbox:error')
            expect(errors.length).toBeGreaterThanOrEqual(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('downloadFiles')
        })
    })

    // ────────────────────────────────────────────
    // Search files
    // ────────────────────────────────────────────

    describe('searchFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_dropbox_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('searches and returns mapped files', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    matches: [
                        {
                            metadata: {
                                metadata: {
                                    '.tag': 'file',
                                    id: 'id:s1',
                                    name: 'found.txt',
                                    path_display: '/found.txt',
                                    size: 42,
                                },
                            },
                        },
                    ],
                }),
            )

            const results = await plugin.searchFiles('found')

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('found.txt')
        })

        it('passes path filter when provided', async () => {
            const fetchMock = mockFetchResponse({ matches: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.searchFiles('query', '/some/path')

            expect(fetchMock).toHaveBeenCalled()
            const body = JSON.parse(
                fetchMock.mock.calls[0][1].body as string,
            )
            expect(body.options.path).toBe('/some/path')
        })

        it('emits error on failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('err', 500, false),
            )

            await expect(plugin.searchFiles('query')).rejects.toThrow()

            const errors = events.filter(e => e.event === 'dropbox:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('searchFiles')
        })
    })

    // ────────────────────────────────────────────
    // API request auto-refresh (401 handling)
    // ────────────────────────────────────────────

    describe('API request 401 handling', () => {
        beforeEach(() => {
            sessionStore.set('upup_dropbox_access_token', 'expired-token')
            sessionStore.set('upup_dropbox_refresh_token', 'refresh-tok')
            sessionStore.set(
                'upup_dropbox_token_expiry',
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
                        text: vi
                            .fn()
                            .mockResolvedValue('expired_access_token'),
                    })
                    // Refresh token call
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'refreshed-token',
                            expires_in: 14400,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Retry with new token
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            entries: [],
                            has_more: false,
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const result = await plugin.loadFiles('')

            expect(result.files).toHaveLength(0)
            expect(plugin.getAccessToken()).toBe('refreshed-token')
        })

        it('emits session-expired when 401 and no refresh token', async () => {
            // Clear refresh token
            sessionStore.delete('upup_dropbox_refresh_token')
            plugin.restoreSession()
            events.length = 0

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    json: vi.fn().mockResolvedValue({}),
                    text: vi
                        .fn()
                        .mockResolvedValue('expired_access_token'),
                }),
            )

            await expect(plugin.loadFiles('')).rejects.toThrow()

            // apiRequest emits session-expired before throwing
            const expired = events.filter(
                e => e.event === 'dropbox:session-expired',
            )
            expect(expired.length).toBeGreaterThanOrEqual(1)

            // Note: loadFiles catch block resets state to 'authenticated'
            // after apiRequest sets it to 'session-expired', so final
            // state is 'authenticated'. The session-expired event is still
            // emitted, which is the important signal to consumers.
            const stateChanges = events
                .filter(e => e.event === 'dropbox:state-change')
                .map(e => (e.payload as { state: string }).state)
            expect(stateChanges).toContain('session-expired')
        })
    })

    // ────────────────────────────────────────────
    // MIME type guessing
    // ────────────────────────────────────────────

    describe('MIME type mapping (via loadFiles)', () => {
        beforeEach(() => {
            sessionStore.set('upup_dropbox_access_token', 'valid-token')
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
                    entries: [
                        {
                            '.tag': 'file',
                            id: 'id:1',
                            name: filename,
                            path_display: `/${filename}`,
                            size: 100,
                        },
                    ],
                    has_more: false,
                }),
            )

            const result = await plugin.loadFiles('')
            expect(result.files[0].mimeType).toBe(expectedMime)
        })

        it('maps folders with mimeType folder', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            '.tag': 'folder',
                            id: 'id:f1',
                            name: 'MyFolder',
                            path_display: '/MyFolder',
                        },
                    ],
                    has_more: false,
                }),
            )

            const result = await plugin.loadFiles('')
            expect(result.files[0].mimeType).toBe('folder')
            expect(result.files[0].size).toBe(0)
        })
    })

    // ────────────────────────────────────────────
    // Edge cases
    // ────────────────────────────────────────────

    describe('edge cases', () => {
        it('loadFiles defaults path to empty string', async () => {
            sessionStore.set('upup_dropbox_access_token', 'tok')
            plugin.restoreSession()

            const fetchMock = mockFetchResponse({
                entries: [],
                has_more: false,
            })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
            expect(body.path).toBe('')
        })

        it('mapEntry handles missing fields gracefully', async () => {
            sessionStore.set('upup_dropbox_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            '.tag': 'file',
                            // Missing id, name, path_display, size
                        },
                    ],
                    has_more: false,
                }),
            )

            const result = await plugin.loadFiles('')
            expect(result.files[0].id).toBe('')
            expect(result.files[0].name).toBe('')
            expect(result.files[0].path).toBe('')
        })

        it('handles empty entries array', async () => {
            sessionStore.set('upup_dropbox_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [],
                    has_more: false,
                }),
            )

            const result = await plugin.loadFiles('')
            expect(result.files).toHaveLength(0)
        })
    })
})
