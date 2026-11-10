import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { GoogleDrivePlugin } from '../src/drives/google-drive-plugin'
import {
    captureEvents,
    mockFetchResponse,
    sessionStore,
    mockSessionStorage,
} from './helpers/google-drive-plugin-fixtures'

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
            expect((stateChanges[0]!.payload as { state: string }).state).toBe(
                'authenticated',
            )
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
            const payload = authEvents[0]!.payload as {
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
                (authEvents[0]!.payload as { user?: unknown }).user,
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
            expect((stateChanges[0]!.payload as { state: string }).state).toBe(
                'idle',
            )
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
            expect((stateChanges[0]!.payload as { state: string }).state).toBe(
                'authenticated',
            )
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

            const headers = fetchMock.mock.calls[0]![1].headers as Headers
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

            vi.stubGlobal('fetch', mockFetchResponse({ files: [] }))

            const result = await plugin.loadFiles()
            expect(result.files).toHaveLength(0)
        })
    })
})
