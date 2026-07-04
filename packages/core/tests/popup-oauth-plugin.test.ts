import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import {
    PopupOAuthPlugin,
    type PopupOAuthSpec,
} from '../src/drives/popup-oauth-plugin'
import type { DriveFile, DriveUser } from '../src/drives/types'

// ── A minimal concrete subclass that exercises ONLY the base skeleton. ──
// Its spec carries a `scope` so the scope-iff-spec.scopes branches are covered;
// FakeNoScopePlugin below covers the Box (no-scope) branch.

const FAKE_SPEC: PopupOAuthSpec = {
    id: 'fake',
    eventPrefix: 'fake',
    popupName: 'UpupFakeAuth',
    authUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://api.example.com/token',
    redirectPath: '/fake_redirect',
    storageKeys: {
        access: 'upup_fake_access_token',
        refresh: 'upup_fake_refresh_token',
        expiry: 'upup_fake_token_expiry',
    },
    scopes: 'read write',
    authParams: { prompt: 'consent' },
}

class FakePopupPlugin extends PopupOAuthPlugin {
    readonly spec = FAKE_SPEC
    protected mapEntry(entry: Record<string, unknown>): DriveFile {
        return {
            id: String(entry.id ?? ''),
            name: String(entry.name ?? ''),
            path: String(entry.id ?? ''),
            size: 0,
            mimeType: 'application/octet-stream',
            isFolder: false,
        }
    }
    protected async fetchUserProfile(): Promise<DriveUser> {
        const res = await this.apiRequest('https://api.example.com/me', {
            method: 'GET',
        })
        const data = await res.json()
        return {
            name: String(data.name ?? ''),
            email: String(data.email ?? ''),
        }
    }
    async loadFiles(): Promise<unknown> {
        const res = await this.apiRequest('https://api.example.com/files', {
            method: 'GET',
        })
        return res.json()
    }
    async downloadFiles(files: DriveFile[]): Promise<File[]> {
        void files
        return []
    }
    // Test-only accessor for the protected token setter.
    callSetTokens(access: string, refresh: string | null, expiresIn?: number) {
        this.setTokens(access, refresh, expiresIn)
    }
}

const NO_SCOPE_SPEC: PopupOAuthSpec = {
    ...FAKE_SPEC,
    id: 'fakebox',
    eventPrefix: 'fakebox',
    scopes: undefined,
    authParams: undefined,
}

class FakeNoScopePlugin extends FakePopupPlugin {
    readonly spec = NO_SCOPE_SPEC
}

// ── Browser-global mocks (mirrors box-plugin.test.ts) ──

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

function captureEvents(emitter: EventEmitter) {
    const events: Array<{ event: string; payload: unknown }> = []
    const originalEmit = emitter.emit.bind(emitter)
    emitter.emit = (event: string, payload?: unknown) => {
        events.push({ event, payload })
        return originalEmit(event, payload)
    }
    return events
}

describe('PopupOAuthPlugin (base skeleton)', () => {
    let plugin: FakePopupPlugin
    let emitter: EventEmitter
    let events: Array<{ event: string; payload: unknown }>
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
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
        sessionStore.clear()

        plugin = new FakePopupPlugin()
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

    // ── id/name from spec ──
    it('derives id and name from the spec', () => {
        expect(plugin.id).toBe('fake')
        expect(plugin.name).toBe('fake')
    })

    // ── getAuthUrl: PKCE params + scope + authParams ──
    describe('getAuthUrl', () => {
        it('emits PKCE params, scope, and authParams from the spec', async () => {
            const url = await plugin.getAuthUrl()
            const parsed = new URL(url)
            expect(parsed.origin + parsed.pathname).toBe(
                'https://auth.example.com/authorize',
            )
            const p = parsed.searchParams
            expect(p.get('client_id')).toBe('test-client-id')
            expect(p.get('response_type')).toBe('code')
            expect(p.get('code_challenge_method')).toBe('S256')
            expect(p.get('code_challenge')).toBeTruthy()
            expect(p.get('redirect_uri')).toBe(
                'https://example.com/fake_redirect',
            )
            expect(p.get('scope')).toBe('read write')
            expect(p.get('prompt')).toBe('consent')
        })

        it('omits scope when spec.scopes is undefined', async () => {
            const noScope = new FakeNoScopePlugin()
            noScope.configure({ clientId: 'c' })
            noScope.init(emitter)
            const url = await noScope.getAuthUrl()
            expect(new URL(url).searchParams.get('scope')).toBeNull()
            expect(new URL(url).searchParams.get('prompt')).toBeNull()
        })

        it('throws when clientId is not configured', async () => {
            const bare = new FakePopupPlugin()
            bare.init(emitter)
            await expect(bare.getAuthUrl()).rejects.toThrow('client_id')
        })
    })

    // ── authenticate: POSTs shared body to spec.tokenUrl, emits authenticated ──
    describe('authenticate', () => {
        it('POSTs the code-exchange body to spec.tokenUrl and emits authenticated', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({
                    access_token: 'at-1',
                    refresh_token: 'rt-1',
                    expires_in: 3600,
                    name: 'Jane',
                    email: 'jane@example.com',
                }),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            // getAuthUrl first so codeVerifier is set
            await plugin.getAuthUrl()
            await plugin.authenticate('auth-code')

            // First fetch is the token exchange
            const [url, opts] = fetchMock.mock.calls[0]
            expect(url).toBe('https://api.example.com/token')
            expect(opts.method).toBe('POST')
            const body = opts.body as URLSearchParams
            expect(body.get('code')).toBe('auth-code')
            expect(body.get('grant_type')).toBe('authorization_code')
            expect(body.get('code_verifier')).toBeTruthy()
            expect(body.get('scope')).toBe('read write')

            expect(plugin.isAuthenticated()).toBe(true)
            const authedEvent = events.find(
                e => e.event === 'fake:authenticated',
            )
            expect(authedEvent).toBeDefined()
            expect((authedEvent!.payload as { user?: DriveUser }).user).toEqual(
                { name: 'Jane', email: 'jane@example.com' },
            )
        })

        it('emits fake:error and rethrows on a failed exchange', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: vi.fn(),
                text: vi.fn().mockResolvedValue('bad_request'),
            })
            vi.stubGlobal('fetch', fetchMock)
            await plugin.getAuthUrl()
            await expect(plugin.authenticate('x')).rejects.toThrow(
                'Token exchange failed',
            )
            expect(events.some(e => e.event === 'fake:error')).toBe(true)
            expect(plugin.getState()).toBe('idle')
        })
    })

    // ── setTokens parses expires_in → expiry key (F-126 behavior) ──
    describe('setTokens / restoreSession — expiry persistence (F-126)', () => {
        it('parses expires_in into an absolute expiry and persists it', () => {
            const before = Date.now()
            plugin.callSetTokens('at', 'rt', 3600)
            expect(sessionStore.get('upup_fake_access_token')).toBe('at')
            expect(sessionStore.get('upup_fake_refresh_token')).toBe('rt')
            const stored = Number(sessionStore.get('upup_fake_token_expiry'))
            expect(stored).toBeGreaterThanOrEqual(before + 3600 * 1000 - 50)
            expect(stored).toBeLessThanOrEqual(Date.now() + 3600 * 1000 + 50)
        })

        it('omits the expiry key when expires_in is absent', () => {
            plugin.callSetTokens('at', 'rt', undefined)
            expect(sessionStore.has('upup_fake_token_expiry')).toBe(false)
        })

        it('restoreSession restores the persisted expiry', () => {
            const expiry = Date.now() + 5000
            sessionStore.set('upup_fake_access_token', 'at')
            sessionStore.set('upup_fake_refresh_token', 'rt')
            sessionStore.set('upup_fake_token_expiry', String(expiry))
            expect(plugin.restoreSession()).toBe(true)
            expect(plugin.isAuthenticated()).toBe(true)
        })

        it('restoreSession returns false with no stored access token', () => {
            expect(plugin.restoreSession()).toBe(false)
        })
    })

    // ── apiRequest: ensureValidToken (proactive) + one-shot 401 retry ──
    describe('apiRequest — proactive refresh + 401 retry', () => {
        it('proactively refreshes a near-expiry token BEFORE the request (no 401 needed)', async () => {
            // Seed a near-expiry session (expires in 10s < 60s window)
            sessionStore.set('upup_fake_access_token', 'stale')
            sessionStore.set('upup_fake_refresh_token', 'rt')
            sessionStore.set(
                'upup_fake_token_expiry',
                String(Date.now() + 10_000),
            )
            plugin.restoreSession()

            const fetchMock = vi.fn(
                (url: string, opts: { body?: URLSearchParams }) => {
                    // token endpoint = refresh; everything else = the data call
                    if (url === 'https://api.example.com/token') {
                        return Promise.resolve({
                            ok: true,
                            status: 200,
                            json: vi.fn().mockResolvedValue({
                                access_token: 'fresh',
                                expires_in: 3600,
                            }),
                            text: vi.fn().mockResolvedValue(''),
                        })
                    }
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({ ok: 1 }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                },
            )
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            // The refresh (token endpoint) fired BEFORE any 401 — first call is refresh.
            expect(fetchMock.mock.calls[0][0]).toBe(
                'https://api.example.com/token',
            )
            expect(fetchMock.mock.calls[1][0]).toBe(
                'https://api.example.com/files',
            )
        })

        it('retries once after a 401 by refreshing the token', async () => {
            plugin.callSetTokens('at', 'rt', undefined) // no expiry → no proactive refresh
            let dataCalls = 0
            const fetchMock = vi.fn((url: string) => {
                if (url === 'https://api.example.com/token') {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: vi
                            .fn()
                            .mockResolvedValue({ access_token: 'fresh2' }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                }
                dataCalls++
                // First data call 401s, second (post-refresh) succeeds
                if (dataCalls === 1) {
                    return Promise.resolve({
                        ok: false,
                        status: 401,
                        json: vi.fn(),
                        text: vi.fn().mockResolvedValue('unauthorized'),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({ ok: 1 }),
                    text: vi.fn().mockResolvedValue(''),
                })
            })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()
            // data(401) → token(refresh) → data(200) = 3 fetches
            expect(fetchMock).toHaveBeenCalledTimes(3)
            expect(dataCalls).toBe(2)
        })

        it('emits session-expired and clears tokens when refresh fails on 401', async () => {
            plugin.callSetTokens('at', 'rt', undefined)
            const fetchMock = vi.fn((url: string) => {
                if (url === 'https://api.example.com/token') {
                    return Promise.resolve({
                        ok: false,
                        status: 400,
                        json: vi.fn(),
                        text: vi.fn().mockResolvedValue('invalid_grant'),
                    })
                }
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    json: vi.fn(),
                    text: vi.fn().mockResolvedValue('unauthorized'),
                })
            })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles().catch(() => {})
            expect(events.some(e => e.event === 'fake:session-expired')).toBe(
                true,
            )
            expect(plugin.getAccessToken()).toBeNull()
        })
    })

    // ── refreshAccessToken: shared refresh body + scope ──
    describe('refreshAccessToken', () => {
        it('POSTs the refresh body with scope to spec.tokenUrl', async () => {
            plugin.callSetTokens('at', 'rt', undefined)
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({
                    access_token: 'at2',
                    expires_in: 3600,
                }),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            const token = await plugin.refreshAccessToken()
            expect(token).toBe('at2')
            const [url, opts] = fetchMock.mock.calls[0]
            expect(url).toBe('https://api.example.com/token')
            const body = opts.body as URLSearchParams
            expect(body.get('grant_type')).toBe('refresh_token')
            expect(body.get('refresh_token')).toBe('rt')
            expect(body.get('scope')).toBe('read write')
        })

        it('returns null when there is no refresh token', async () => {
            expect(await plugin.refreshAccessToken()).toBeNull()
        })
    })

    // ── signOut / lifecycle ──
    describe('signOut and destroy', () => {
        it('signOut clears tokens and emits signed-out', () => {
            plugin.callSetTokens('at', 'rt', 3600)
            plugin.signOut()
            expect(plugin.getAccessToken()).toBeNull()
            expect(plugin.getState()).toBe('idle')
            expect(events.some(e => e.event === 'fake:signed-out')).toBe(true)
            expect(sessionStore.has('upup_fake_access_token')).toBe(false)
        })

        it('getUserInfo returns null when not authenticated', async () => {
            expect(await plugin.getUserInfo()).toBeNull()
        })
    })

    // ── popup: user closes it → resolves without error ──
    describe('authenticateViaPopup', () => {
        it('resolves without error when the user closes the popup', async () => {
            vi.useFakeTimers()
            const fakeWindow = { closed: false, close: vi.fn(), location: {} }
            vi.stubGlobal('window', {
                location: { origin: 'https://example.com' },
                open: vi.fn(() => fakeWindow),
                screenX: 0,
                screenY: 0,
            })

            const promise = plugin.authenticateViaPopup()
            // Simulate the user closing the popup, then advance the poll timer
            fakeWindow.closed = true
            await vi.advanceTimersByTimeAsync(600)
            await expect(promise).resolves.toBeUndefined()
            expect(plugin.getState()).toBe('idle')
            vi.useRealTimers()
        })
    })
})
