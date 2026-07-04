import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { BoxPlugin } from '../src/drives/box-plugin'
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
        id: 'abc123',
        name: 'test.txt',
        path: 'abc123',
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

describe('BoxPlugin', () => {
    let plugin: BoxPlugin
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

        plugin = new BoxPlugin()
        emitter = new EventEmitter()
        events = captureEvents(emitter)

        plugin.configure({ clientId: 'test-client-id' })
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
            expect(plugin.id).toBe('box')
            expect(plugin.name).toBe('box')
        })

        it('configure() stores config and returns this', () => {
            const fresh = new BoxPlugin()
            const result = fresh.configure({
                clientId: 'abc',
                redirectUri: 'https://example.com/cb',
            })
            expect(result).toBe(fresh)
            expect(fresh.getConfig()).toEqual({
                clientId: 'abc',
                redirectUri: 'https://example.com/cb',
            })
        })

        it('getConfig() returns the current config', () => {
            expect(plugin.getConfig()).toEqual({
                clientId: 'test-client-id',
            })
        })

        it('init() sets the emitter', () => {
            plugin.signOut()
            const signedOutEvents = events.filter(
                e => e.event === 'box:signed-out',
            )
            expect(signedOutEvents).toHaveLength(1)
        })

        it('destroy() clears the emitter', () => {
            plugin.destroy()
            plugin.signOut()
            const postDestroyEvents = events.filter(
                e => e.event === 'box:signed-out',
            )
            expect(postDestroyEvents).toHaveLength(0)
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
        it('returns a valid Box OAuth URL with PKCE params', async () => {
            const url = await plugin.getAuthUrl()

            expect(url).toContain('https://account.box.com/api/oauth2/authorize')
            const parsed = new URL(url)
            expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
            expect(parsed.searchParams.get('response_type')).toBe('code')
            expect(parsed.searchParams.get('code_challenge_method')).toBe(
                'S256',
            )
            expect(parsed.searchParams.get('code_challenge')).toBeTruthy()
            expect(parsed.searchParams.get('redirect_uri')).toBeTruthy()
        })

        it('uses configured redirect_uri when provided', async () => {
            plugin.configure({
                clientId: 'test-client-id',
                redirectUri: 'https://custom.com/callback',
            })

            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.searchParams.get('redirect_uri')).toBe(
                'https://custom.com/callback',
            )
        })

        it('falls back to window.location.origin + /box_redirect', async () => {
            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.searchParams.get('redirect_uri')).toBe(
                'https://example.com/box_redirect',
            )
        })

        it('throws if clientId is not configured', async () => {
            plugin.configure({ clientId: '' })
            await expect(plugin.getAuthUrl()).rejects.toThrow(
                'Box client_id is not configured',
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
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // User profile fetch
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: 'Test User',
                            login: 'test@example.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('auth-code-xyz')

            expect(plugin.getState()).toBe('authenticated')
            expect(plugin.isAuthenticated()).toBe(true)
            expect(plugin.getAccessToken()).toBe('access-123')

            const authEvents = events.filter(
                e => e.event === 'box:authenticated',
            )
            expect(authEvents).toHaveLength(1)
            expect(
                (authEvents[0].payload as { user: { name: string } }).user.name,
            ).toBe('Test User')

            // Tokens saved to session storage
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_box_access_token',
                'access-123',
            )
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'upup_box_refresh_token',
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
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: 'U',
                            login: 'u@e.com',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')

            const stateChanges = events
                .filter(e => e.event === 'box:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('authenticating')
            expect(stateChanges).toContain('authenticated')
        })

        it('throws if client_id not configured', async () => {
            plugin.configure({ clientId: '' })
            await expect(plugin.authenticate('code')).rejects.toThrow(
                'Box client_id is not configured',
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
                e => e.event === 'box:error',
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
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Profile fetch fails
                    .mockRejectedValueOnce(new Error('network error')),
            )

            await plugin.authenticate('code')

            expect(plugin.getState()).toBe('authenticated')
            const authEvents = events.filter(
                e => e.event === 'box:authenticated',
            )
            expect(authEvents).toHaveLength(1)
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
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: '',
                            login: '',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            await plugin.authenticate('code')
            events.length = 0

            // Now mock the refresh call
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({
                        access_token: 'new-token',
                        refresh_token: 'new-refresh',
                    }),
                    text: vi.fn().mockResolvedValue(''),
                }),
            )

            const result = await plugin.refreshAccessToken()

            expect(result).toBe('new-token')
            expect(plugin.getAccessToken()).toBe('new-token')
        })

        it('returns null if no client_id', async () => {
            plugin.configure({ clientId: '' })
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
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: '',
                            login: '',
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
                e => e.event === 'box:session-expired',
            )
            expect(expired).toHaveLength(1)

            const errors = events.filter(e => e.event === 'box:error')
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
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            name: '',
                            login: '',
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
                e => e.event === 'box:signed-out',
            )
            expect(signedOut).toHaveLength(1)

            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_box_access_token',
            )
            expect(sessionStorage.removeItem).toHaveBeenCalledWith(
                'upup_box_refresh_token',
            )
        })

        it('emits state-change to idle', () => {
            plugin.signOut()
            const stateChanges = events.filter(
                e => e.event === 'box:state-change',
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
            sessionStore.set('upup_box_access_token', 'stored-token')
            sessionStore.set('upup_box_refresh_token', 'stored-refresh')

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
            sessionStore.set('upup_box_access_token', 'token-only')

            const result = plugin.restoreSession()

            expect(result).toBe(true)
            expect(plugin.getAccessToken()).toBe('token-only')
        })

        it('emits state-change to authenticated', () => {
            sessionStore.set('upup_box_access_token', 'tok')

            plugin.restoreSession()

            const stateChanges = events.filter(
                e => e.event === 'box:state-change',
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
            sessionStore.set('upup_box_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('calls Box API and returns files', async () => {
            const boxEntries = [
                {
                    type: 'file',
                    id: 'file1',
                    name: 'document.pdf',
                    size: 1024,
                    modified_at: '2024-01-01T00:00:00Z',
                },
                {
                    type: 'folder',
                    id: 'folder1',
                    name: 'Photos',
                },
            ]

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ entries: boxEntries }),
            )

            const result = await plugin.loadFiles('0')

            expect(result.files).toHaveLength(2)
            expect(result.files[0].name).toBe('document.pdf')
            expect(result.files[0].mimeType).toBe('application/pdf')
            expect(result.files[0].isFolder).toBe(false)
            expect(result.files[1].name).toBe('Photos')
            expect(result.files[1].isFolder).toBe(true)
            expect(result.folderId).toBe('0')
        })

        it('emits files-loaded event', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            type: 'file',
                            id: '1',
                            name: 'test.txt',
                            size: 10,
                        },
                    ],
                }),
            )

            await plugin.loadFiles('123')

            const loaded = events.filter(
                e => e.event === 'box:files-loaded',
            )
            expect(loaded).toHaveLength(1)
            const payload = loaded[0].payload as {
                files: DriveFile[]
                folderId: string
            }
            expect(payload.files).toHaveLength(1)
            expect(payload.folderId).toBe('123')
        })

        it('transitions state to browsing then back to authenticated', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ entries: [] }),
            )

            await plugin.loadFiles('0')

            const stateChanges = events
                .filter(e => e.event === 'box:state-change')
                .map(e => (e.payload as { state: string }).state)

            expect(stateChanges).toContain('browsing')
            expect(stateChanges[stateChanges.length - 1]).toBe('authenticated')
        })

        it('emits error on API failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('server error', 500, false),
            )

            await expect(plugin.loadFiles('0')).rejects.toThrow()

            const errors = events.filter(e => e.event === 'box:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadFiles')
        })

        it('throws when not authenticated', async () => {
            const fresh = new BoxPlugin()
            fresh.configure({ clientId: 'id' })
            fresh.init(emitter)

            await expect(fresh.loadFiles('0')).rejects.toThrow(
                'Not authenticated',
            )
        })

        it('defaults folderId to 0 (root)', async () => {
            const fetchMock = mockFetchResponse({ entries: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            expect(fetchMock).toHaveBeenCalled()
            const calledUrl = fetchMock.mock.calls[0][0] as string
            expect(calledUrl).toContain('/folders/0/items')
        })

        it('computes hasMore/cursor from total_count (F-125)', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [{ type: 'file', id: '1', name: 'a.txt', size: 1 }],
                    total_count: 5,
                    offset: 0,
                }),
            )

            const result = await plugin.loadFiles('0')

            expect(result.hasMore).toBe(true)
            expect(result.cursor).toBe('0:1')
        })

        it('hasMore is false once the offset catches up to total_count', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [{ type: 'file', id: '1', name: 'a.txt', size: 1 }],
                    total_count: 1,
                    offset: 0,
                }),
            )

            const result = await plugin.loadFiles('0')

            expect(result.hasMore).toBe(false)
            expect(result.cursor).toBeUndefined()
        })

        it('falls back to a length-based hasMore when total_count is absent', async () => {
            // Existing fixtures across this file mock { entries } with no total_count —
            // must not regress into a false "always more" state.
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ entries: [] }),
            )

            const result = await plugin.loadFiles('0')

            expect(result.hasMore).toBe(false)
        })
    })

    describe('loadMoreFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_box_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('continues listing from the encoded folderId:offset cursor', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [{ type: 'file', id: '2', name: 'b.txt', size: 2 }],
                    total_count: 2,
                    offset: 1,
                }),
            )

            const result = await plugin.loadMoreFiles('0:1')

            expect(result.files).toHaveLength(1)
            expect(result.files[0].name).toBe('b.txt')
            expect(result.hasMore).toBe(false)
            expect(result.cursor).toBeUndefined()
        })

        it('emits error on failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('server error', 500, false),
            )

            await expect(plugin.loadMoreFiles('0:1')).rejects.toThrow()

            const errors = events.filter(e => e.event === 'box:error')
            expect(errors).toHaveLength(1)
            expect(
                (errors[0].payload as { action: string }).action,
            ).toBe('loadMoreFiles')
        })
    })

    // ────────────────────────────────────────────
    // File download
    // ────────────────────────────────────────────

    describe('downloadFiles()', () => {
        beforeEach(() => {
            sessionStore.set('upup_box_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('downloads files and returns them as File objects', async () => {
            const driveFiles = [
                makeDriveFile({ id: '1', name: 'a.txt' }),
                makeDriveFile({ id: '2', name: 'b.txt' }),
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
                                new Blob(['content1'], {
                                    type: 'text/plain',
                                }),
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
                makeDriveFile({ id: '1', name: 'fail.txt' }),
                makeDriveFile({ id: '2', name: 'ok.txt' }),
            ]

            vi.stubGlobal(
                'fetch',
                vi.fn()
                    // Download file 1 - fails
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 500,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi.fn().mockResolvedValue('server error'),
                    })
                    // Download file 2 - succeeds
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

            const errors = events.filter(e => e.event === 'box:error')
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
            sessionStore.set('upup_box_access_token', 'valid-token')
            plugin.restoreSession()
            events.length = 0
        })

        it('searches and returns mapped files', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            type: 'file',
                            id: 's1',
                            name: 'found.txt',
                            size: 42,
                        },
                    ],
                }),
            )

            const results = await plugin.searchFiles('found')

            expect(results).toHaveLength(1)
            expect(results[0].name).toBe('found.txt')
        })

        it('passes query parameter in the URL', async () => {
            const fetchMock = mockFetchResponse({ entries: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.searchFiles('my query')

            expect(fetchMock).toHaveBeenCalled()
            const calledUrl = fetchMock.mock.calls[0][0] as string
            expect(calledUrl).toContain('query=my+query')
        })

        it('emits error on failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('err', 500, false),
            )

            await expect(plugin.searchFiles('query')).rejects.toThrow()

            const errors = events.filter(e => e.event === 'box:error')
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
            sessionStore.set('upup_box_access_token', 'expired-token')
            sessionStore.set('upup_box_refresh_token', 'refresh-tok')
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
                            .mockResolvedValue('unauthorized'),
                    })
                    // Refresh token call
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            access_token: 'refreshed-token',
                            refresh_token: 'new-refresh',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    // Retry with new token
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            entries: [],
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    }),
            )

            const result = await plugin.loadFiles('0')

            expect(result.files).toHaveLength(0)
            expect(plugin.getAccessToken()).toBe('refreshed-token')
        })

        it('emits session-expired when 401 and no refresh token', async () => {
            // Clear refresh token
            sessionStore.delete('upup_box_refresh_token')
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
                        .mockResolvedValue('unauthorized'),
                }),
            )

            await expect(plugin.loadFiles('0')).rejects.toThrow()

            const expired = events.filter(
                e => e.event === 'box:session-expired',
            )
            expect(expired.length).toBeGreaterThanOrEqual(1)

            const stateChanges = events
                .filter(e => e.event === 'box:state-change')
                .map(e => (e.payload as { state: string }).state)
            expect(stateChanges).toContain('session-expired')
        })
    })

    // ────────────────────────────────────────────
    // MIME type guessing
    // ────────────────────────────────────────────

    describe('MIME type mapping (via loadFiles)', () => {
        beforeEach(() => {
            sessionStore.set('upup_box_access_token', 'valid-token')
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
                            type: 'file',
                            id: '1',
                            name: filename,
                            size: 100,
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles('0')
            expect(result.files[0].mimeType).toBe(expectedMime)
        })

        it('maps folders with mimeType folder', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            type: 'folder',
                            id: 'f1',
                            name: 'MyFolder',
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles('0')
            expect(result.files[0].mimeType).toBe('folder')
            expect(result.files[0].size).toBe(0)
        })
    })

    // ────────────────────────────────────────────
    // Edge cases
    // ────────────────────────────────────────────

    describe('edge cases', () => {
        it('mapEntry handles missing fields gracefully', async () => {
            sessionStore.set('upup_box_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    entries: [
                        {
                            type: 'file',
                            // Missing id, name, size
                        },
                    ],
                }),
            )

            const result = await plugin.loadFiles('0')
            expect(result.files[0].id).toBe('')
            expect(result.files[0].name).toBe('')
        })

        it('handles empty entries array', async () => {
            sessionStore.set('upup_box_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({ entries: [] }),
            )

            const result = await plugin.loadFiles('0')
            expect(result.files).toHaveLength(0)
        })

        it('handles missing entries key', async () => {
            sessionStore.set('upup_box_access_token', 'tok')
            plugin.restoreSession()

            vi.stubGlobal(
                'fetch',
                mockFetchResponse({}),
            )

            const result = await plugin.loadFiles('0')
            expect(result.files).toHaveLength(0)
        })
    })
})
