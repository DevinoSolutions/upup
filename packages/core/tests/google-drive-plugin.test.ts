import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import {
    GoogleDrivePlugin,
    SHARED_WITH_ME_FOLDER_ID,
} from '../src/drives/google-drive-plugin'
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
        text: vi
            .fn()
            .mockResolvedValue(
                typeof body === 'string' ? body : JSON.stringify(body),
            ),
        blob: vi
            .fn()
            .mockResolvedValue(
                new Blob(['file-content'], { type: 'text/plain' }),
            ),
    })
}

/**
 * Every request this run made to `endpoint`, as parsed query params. A root
 * listing with `sharedDrives` on hits TWO endpoints, so a test must say which
 * one it means rather than reading whichever call happened last.
 */
function requestsTo(
    fetchMock: ReturnType<typeof vi.fn>,
    endpoint: string,
): URLSearchParams[] {
    return fetchMock.mock.calls
        .map(call => call[0] as string)
        .filter(url => url.startsWith(endpoint))
        .map(url => new URL(url).searchParams)
}

function firstRequestTo(
    fetchMock: ReturnType<typeof vi.fn>,
    endpoint: string,
): URLSearchParams {
    const found = requestsTo(fetchMock, endpoint)[0]
    if (!found) throw new Error(`no request was made to ${endpoint}`)
    return found
}

function stubbedResponse(body: unknown) {
    return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(body),
        text: vi.fn().mockResolvedValue(JSON.stringify(body)),
        blob: vi.fn().mockResolvedValue(new Blob(['file-content'])),
    }
}

/** A fetch mock answering each call with the next body in the list. */
function mockFetchSequence(bodies: unknown[]): ReturnType<typeof vi.fn> {
    const mock = vi.fn()
    for (const body of bodies) {
        mock.mockResolvedValueOnce(stubbedResponse(body))
    }
    mock.mockResolvedValue(stubbedResponse({}))
    return mock
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

            vi.stubGlobal('fetch', mockFetchResponse({ files: driveEntries }))

            const result = await plugin.loadFiles()

            expect(result.files).toHaveLength(2)
            expect(result.files[0]!.name).toBe('document.pdf')
            expect(result.files[0]!.mimeType).toBe('application/pdf')
            expect(result.files[0]!.isFolder).toBe(false)
            expect(result.files[0]!.size).toBe(1024)
            expect(result.files[0]!.thumbnail).toBe('https://thumb.url')
            expect(result.files[1]!.name).toBe('Photos')
            expect(result.files[1]!.isFolder).toBe(true)
            expect(result.files[1]!.mimeType).toBe('folder')
            expect(result.folderId).toBe('root')
        })

        it('uses provided folderId', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)

            const result = await plugin.loadFiles('folder-xyz')

            expect(result.folderId).toBe('folder-xyz')

            // Check the query parameter
            const url = fetchMock.mock.calls[0]![0] as string
            expect(url).toContain('folder-xyz')
        })

        it('defaults to root folder', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            const url = fetchMock.mock.calls[0]![0] as string
            const parsed = new URL(url)
            const q = parsed.searchParams.get('q')
            expect(q).toContain("'root' in parents")
        })

        it('includes api_key in request', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)

            await plugin.loadFiles()

            const url = fetchMock.mock.calls[0]![0] as string
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
            const payload = loaded[0]!.payload as {
                files: DriveFile[]
                folderId: string
            }
            expect(payload.files).toHaveLength(1)
            expect(payload.folderId).toBe('my-folder')
        })

        it('transitions state to browsing then back to authenticated', async () => {
            vi.stubGlobal('fetch', mockFetchResponse({ files: [] }))

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

            const errors = events.filter(e => e.event === 'google-drive:error')
            expect(errors).toHaveLength(1)
            expect((errors[0]!.payload as { action: string }).action).toBe(
                'loadFiles',
            )
        })

        it('throws when not authenticated', async () => {
            const fresh = new GoogleDrivePlugin()
            fresh.configure({
                apiKey: 'key',
                appId: 'app',
                clientId: 'client',
            })
            fresh.init(emitter)

            await expect(fresh.loadFiles()).rejects.toThrow('Not authenticated')
        })

        it('handles empty files array', async () => {
            vi.stubGlobal('fetch', mockFetchResponse({ files: [] }))

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
            expect(result.files[0]!.id).toBe('x')
            expect(result.files[0]!.name).toBe('')
            expect(result.files[0]!.size).toBe(0)
        })

        it('computes hasMore/cursor from nextPageToken (F-125)', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse({
                    files: [{ id: '1', name: 'a.txt', mimeType: 'text/plain' }],
                    nextPageToken: 'page-2-token',
                }),
            )

            const result = await plugin.loadFiles('my-folder')

            expect(result.hasMore).toBe(true)
            expect(result.cursor).toBe(
                JSON.stringify({
                    folderId: 'my-folder',
                    pageToken: 'page-2-token',
                }),
            )
        })

        it('hasMore is false when nextPageToken is absent (last page)', async () => {
            vi.stubGlobal('fetch', mockFetchResponse({ files: [] }))

            const result = await plugin.loadFiles()

            expect(result.hasMore).toBe(false)
            expect(result.cursor).toBeUndefined()
        })
    })

    describe('loadMoreFiles()', () => {
        beforeEach(() => {
            plugin.setAccessToken('valid-token', 3600)
            events.length = 0
        })

        it('continues listing from the encoded {folderId, pageToken} cursor', async () => {
            const fetchMock = mockFetchResponse({
                files: [{ id: '2', name: 'b.txt', mimeType: 'text/plain' }],
            })
            vi.stubGlobal('fetch', fetchMock)

            const cursor = JSON.stringify({
                folderId: 'my-folder',
                pageToken: 'page-2-token',
            })
            const result = await plugin.loadMoreFiles(cursor)

            expect(result.files).toHaveLength(1)
            expect(result.files[0]!.name).toBe('b.txt')
            expect(result.hasMore).toBe(false)

            const url = fetchMock.mock.calls[0]![0] as string
            const parsed = new URL(url)
            expect(parsed.searchParams.get('pageToken')).toBe('page-2-token')
            expect(parsed.searchParams.get('q')).toContain(
                "'my-folder' in parents",
            )
        })

        it('emits error on failure', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchResponse('server error', 500, false),
            )

            const cursor = JSON.stringify({ folderId: 'root', pageToken: 'x' })
            await expect(plugin.loadMoreFiles(cursor)).rejects.toThrow()

            const errors = events.filter(e => e.event === 'google-drive:error')
            expect(errors).toHaveLength(1)
            expect((errors[0]!.payload as { action: string }).action).toBe(
                'loadMoreFiles',
            )
        })
    })

    // ────────────────────────────────────────────
    // File download (regular files)
    // ────────────────────────────────────────────

    // ────────────────────────────────────────────
    // Shared drives (#391)
    // ────────────────────────────────────────────

    describe('sharedDrives config option (#391)', () => {
        const FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files'
        const DRIVES_ENDPOINT = 'https://www.googleapis.com/drive/v3/drives'
        const SHARED_DRIVE_LIST_PARAMS = [
            'corpora',
            'includeItemsFromAllDrives',
            'supportsAllDrives',
        ] as const

        function configureWithSharedDrives(enabled: boolean): void {
            plugin.configure({
                apiKey: 'test-api-key',
                appId: 'test-app-id',
                clientId: 'test-client-id',
                sharedDrives: enabled,
            })
            plugin.setAccessToken('valid-token', 3600)
        }

        it('omits every shared-drive param from loadFiles when the option is unset, so an existing picker keeps its My-Drive-only shape', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)
            plugin.setAccessToken('valid-token', 3600)

            await plugin.loadFiles()

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            for (const name of SHARED_DRIVE_LIST_PARAMS) {
                expect(params.has(name)).toBe(false)
            }
            expect(requestsTo(fetchMock, DRIVES_ENDPOINT)).toHaveLength(0)
        })

        it('omits every shared-drive param from loadFiles when the option is explicitly false', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(false)

            await plugin.loadFiles()

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            for (const name of SHARED_DRIVE_LIST_PARAMS) {
                expect(params.has(name)).toBe(false)
            }
            expect(requestsTo(fetchMock, DRIVES_ENDPOINT)).toHaveLength(0)
        })

        it('returns only the real My Drive children at the root when the option is off — no shared drives and no Shared-with-me entry', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchSequence([
                    {
                        files: [
                            {
                                id: 'f1',
                                name: 'own.txt',
                                mimeType: 'text/plain',
                            },
                        ],
                    },
                ]),
            )
            plugin.setAccessToken('valid-token', 3600)

            const result = await plugin.loadFiles()

            expect(result.files.map(f => f.id)).toEqual(['f1'])
        })

        it('sends corpora=allDrives with both all-drives flags on loadFiles when the option is on', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }, { drives: [] }])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadFiles()

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('corpora')).toBe('allDrives')
            expect(params.get('includeItemsFromAllDrives')).toBe('true')
            expect(params.get('supportsAllDrives')).toBe('true')
        })

        it('keeps the folder query and the api key alongside the shared-drive params on loadFiles', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadFiles('folder-in-a-shared-drive')

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('q')).toContain(
                "'folder-in-a-shared-drive' in parents",
            )
            expect(params.get('key')).toBe('test-api-key')
            expect(params.get('corpora')).toBe('allDrives')
        })

        it('sends the shared-drive params on the paginated loadMoreFiles call too, so page 2 does not narrow back to My Drive', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadMoreFiles(
                JSON.stringify({
                    folderId: 'shared-folder',
                    pageToken: 'page-2-token',
                }),
            )

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('pageToken')).toBe('page-2-token')
            expect(params.get('corpora')).toBe('allDrives')
            expect(params.get('includeItemsFromAllDrives')).toBe('true')
            expect(params.get('supportsAllDrives')).toBe('true')
        })

        it('omits the shared-drive params from loadMoreFiles when the option is off, and asks for no drives list', async () => {
            const fetchMock = mockFetchResponse({ files: [] })
            vi.stubGlobal('fetch', fetchMock)
            plugin.setAccessToken('valid-token', 3600)

            await plugin.loadMoreFiles(
                JSON.stringify({ folderId: 'root', pageToken: 'p2' }),
            )

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            for (const name of SHARED_DRIVE_LIST_PARAMS) {
                expect(params.has(name)).toBe(false)
            }
            expect(params.get('q')).toContain("'root' in parents")
            expect(requestsTo(fetchMock, DRIVES_ENDPOINT)).toHaveLength(0)
        })

        it('sends supportsAllDrives when downloading a file so a listed shared-drive file does not 404 on fetch', async () => {
            const fetchMock = mockFetchResponse('file-content')
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.downloadFile(makeDriveFile({ id: 'shared-file-id' }))

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('alt')).toBe('media')
            expect(params.get('supportsAllDrives')).toBe('true')
        })

        it('omits supportsAllDrives from the download when the option is off, and never sends the list-only params there', async () => {
            const fetchMock = mockFetchResponse('file-content')
            vi.stubGlobal('fetch', fetchMock)
            plugin.setAccessToken('valid-token', 3600)

            await plugin.downloadFile(makeDriveFile({ id: 'my-drive-file-id' }))

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.has('supportsAllDrives')).toBe(false)
            expect(params.has('corpora')).toBe(false)
            expect(params.has('includeItemsFromAllDrives')).toBe(false)
        })

        // ── On: the shared drives are reachable, not merely queryable ──

        it('puts each shared drive at the TOP of the root listing as a navigable folder, ahead of the My Drive children', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchSequence([
                    {
                        files: [
                            {
                                id: 'f1',
                                name: 'own.txt',
                                mimeType: 'text/plain',
                            },
                        ],
                    },
                    {
                        drives: [
                            { id: 'drive-a', name: 'Team A' },
                            { id: 'drive-b', name: 'Team B' },
                        ],
                    },
                ]),
            )
            configureWithSharedDrives(true)

            const result = await plugin.loadFiles()

            expect(result.files.map(f => f.id)).toEqual([
                'drive-a',
                'drive-b',
                SHARED_WITH_ME_FOLDER_ID,
                'f1',
            ])
            const teamA = result.files[0]!
            expect(teamA.name).toBe('Team A')
            expect(teamA.isFolder).toBe(true)
            expect(teamA.mimeType).toBe('folder')
            expect(teamA.thumbnail).toBeUndefined()
        })

        it('keeps the My Drive listing when drives.list answers 403, degrading to no shared-drive rows instead of an empty picker, and reports it on a non-fatal event', async () => {
            vi.stubGlobal(
                'fetch',
                vi
                    .fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            files: [
                                {
                                    id: 'f1',
                                    name: 'own.txt',
                                    mimeType: 'text/plain',
                                },
                            ],
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 403,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi
                            .fn()
                            .mockResolvedValue('sharing policy forbids this'),
                    }),
            )
            configureWithSharedDrives(true)
            events.length = 0

            const result = await plugin.loadFiles()

            // The shared-drive rows are gone, the My Drive children survive, and
            // Shared-with-me stays: it is a files.list query, so a drives.list
            // failure says nothing about whether that door works.
            expect(result.files.map(f => f.id)).toEqual([
                SHARED_WITH_ME_FOLDER_ID,
                'f1',
            ])
            expect(
                events.filter(e => e.event === 'google-drive:error'),
            ).toHaveLength(0)
            const degraded = events.filter(
                e => e.event === 'google-drive:shared-drives-error',
            )
            expect(degraded).toHaveLength(1)
            expect(
                (degraded[0]!.payload as { error: Error }).error.message,
            ).toContain('403')
        })

        it('keeps the shared drives it already collected when a later drives.list page fails', async () => {
            vi.stubGlobal(
                'fetch',
                vi
                    .fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({ files: [] }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        status: 200,
                        json: vi.fn().mockResolvedValue({
                            drives: [{ id: 'drive-a', name: 'Team A' }],
                            nextPageToken: 'drives-page-2',
                        }),
                        text: vi.fn().mockResolvedValue(''),
                    })
                    .mockResolvedValueOnce({
                        ok: false,
                        status: 500,
                        json: vi.fn().mockResolvedValue({}),
                        text: vi.fn().mockResolvedValue('upstream exploded'),
                    }),
            )
            configureWithSharedDrives(true)
            events.length = 0

            const result = await plugin.loadFiles()

            expect(result.files.map(f => f.id)).toEqual([
                'drive-a',
                SHARED_WITH_ME_FOLDER_ID,
            ])
            expect(
                events.filter(
                    e => e.event === 'google-drive:shared-drives-error',
                ),
            ).toHaveLength(1)
            expect(
                events.filter(e => e.event === 'google-drive:error'),
            ).toHaveLength(0)
        })

        it('asks drives.list for id and name a hundred at a time', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }, { drives: [] }])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadFiles()

            const params = firstRequestTo(fetchMock, DRIVES_ENDPOINT)
            expect(params.get('pageSize')).toBe('100')
            expect(params.get('fields')).toBe('nextPageToken,drives(id,name)')
            expect(params.get('key')).toBe('test-api-key')
        })

        it('follows drives.list pagination so a user in more shared drives than one page still sees them all', async () => {
            const fetchMock = mockFetchSequence([
                { files: [] },
                {
                    drives: [{ id: 'drive-a', name: 'Team A' }],
                    nextPageToken: 'drives-page-2',
                },
                { drives: [{ id: 'drive-b', name: 'Team B' }] },
            ])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            const result = await plugin.loadFiles()

            const driveCalls = requestsTo(fetchMock, DRIVES_ENDPOINT)
            expect(driveCalls).toHaveLength(2)
            expect(driveCalls[0]!.has('pageToken')).toBe(false)
            expect(driveCalls[1]!.get('pageToken')).toBe('drives-page-2')
            expect(result.files.map(f => f.id)).toEqual([
                'drive-a',
                'drive-b',
                SHARED_WITH_ME_FOLDER_ID,
            ])
        })

        it('lists a shared drive by the ordinary parent query once the user navigates into it, and asks for no second drives list', async () => {
            const fetchMock = mockFetchSequence([
                {
                    files: [
                        {
                            id: 'v1',
                            name: 'launch.mp4',
                            mimeType: 'video/mp4',
                        },
                    ],
                },
            ])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            const result = await plugin.loadFiles('drive-a')

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('q')).toBe(
                "'drive-a' in parents and trashed = false",
            )
            expect(params.get('corpora')).toBe('allDrives')
            expect(params.get('includeItemsFromAllDrives')).toBe('true')
            expect(params.get('supportsAllDrives')).toBe('true')
            expect(requestsTo(fetchMock, DRIVES_ENDPOINT)).toHaveLength(0)
            expect(result.files.map(f => f.name)).toEqual(['launch.mp4'])
        })

        it('paginates a shared drive by its drive id, and does not re-append the shared drives to the continuation page', async () => {
            const fetchMock = mockFetchSequence([
                {
                    files: [
                        {
                            id: 'v2',
                            name: 'teaser.mp4',
                            mimeType: 'video/mp4',
                        },
                    ],
                },
            ])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            const page = await plugin.loadMoreFiles(
                JSON.stringify({
                    folderId: 'drive-a',
                    pageToken: 'drive-a-page-2',
                }),
            )

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('q')).toBe(
                "'drive-a' in parents and trashed = false",
            )
            expect(params.get('pageToken')).toBe('drive-a-page-2')
            expect(page.files.map(f => f.id)).toEqual(['v2'])
            expect(requestsTo(fetchMock, DRIVES_ENDPOINT)).toHaveLength(0)
        })

        it('carries the root cursor so a My Drive root with more pages still paginates with the option on', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchSequence([
                    { files: [], nextPageToken: 'root-page-2' },
                    { drives: [] },
                ]),
            )
            configureWithSharedDrives(true)

            const result = await plugin.loadFiles()

            expect(result.hasMore).toBe(true)
            expect(result.cursor).toBe(
                JSON.stringify({
                    folderId: 'root',
                    pageToken: 'root-page-2',
                }),
            )
        })

        it('keeps the shared-drive rows ahead of a second My Drive page, which the controller appends to the end of the list', async () => {
            vi.stubGlobal(
                'fetch',
                mockFetchSequence([
                    {
                        files: [
                            {
                                id: 'page1',
                                name: 'a.txt',
                                mimeType: 'text/plain',
                            },
                        ],
                        nextPageToken: 'root-page-2',
                    },
                    { drives: [{ id: 'drive-a', name: 'Team A' }] },
                ]),
            )
            configureWithSharedDrives(true)

            const first = await plugin.loadFiles()

            // Page 1 leads with the doors out of My Drive; a continuation page
            // lands after everything here, so those rows stay at the top.
            expect(first.files.map(f => f.id)).toEqual([
                'drive-a',
                SHARED_WITH_ME_FOLDER_ID,
                'page1',
            ])
            expect(first.hasMore).toBe(true)
        })

        // ── On: query-value escaping ──

        it('escapes a quote in a folder id so it cannot close the query literal and inject syntax', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadFiles("id' or name contains 'x")

            const q = firstRequestTo(fetchMock, FILES_ENDPOINT).get('q')
            expect(q).toBe(
                "'id\\' or name contains \\'x' in parents and trashed = false",
            )
        })

        it('escapes a backslash in a folder id before the quotes, so the escape cannot be escaped away', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }])
            vi.stubGlobal('fetch', fetchMock)
            plugin.setAccessToken('valid-token', 3600)

            const backslash = String.fromCharCode(92)
            await plugin.loadFiles(`a${backslash}'b`)

            const q = firstRequestTo(fetchMock, FILES_ENDPOINT).get('q')
            expect(q).toBe(
                `'a${backslash}${backslash}${backslash}'b' in parents and trashed = false`,
            )
        })

        it('escapes the folder id on the paginated call too', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadMoreFiles(
                JSON.stringify({ folderId: "dri've", pageToken: 'p2' }),
            )

            const q = firstRequestTo(fetchMock, FILES_ENDPOINT).get('q')
            expect(q).toBe("'dri\\'ve' in parents and trashed = false")
        })

        // ── On: the Shared-with-me virtual folder ──

        it('queries sharedWithMe rather than a parent for the virtual Shared-with-me folder, because Drive has no such parent', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            const result = await plugin.loadFiles(SHARED_WITH_ME_FOLDER_ID)

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('q')).toBe(
                'sharedWithMe = true and trashed = false',
            )
            expect(params.get('q')).not.toContain('in parents')
            expect(params.get('corpora')).toBe('allDrives')
            expect(result.folderId).toBe(SHARED_WITH_ME_FOLDER_ID)
            expect(requestsTo(fetchMock, DRIVES_ENDPOINT)).toHaveLength(0)
        })

        it('keeps the sharedWithMe query on page 2 of that folder, instead of asking for a parent that matches nothing', async () => {
            const fetchMock = mockFetchSequence([{ files: [] }])
            vi.stubGlobal('fetch', fetchMock)
            configureWithSharedDrives(true)

            await plugin.loadMoreFiles(
                JSON.stringify({
                    folderId: SHARED_WITH_ME_FOLDER_ID,
                    pageToken: 'shared-page-2',
                }),
            )

            const params = firstRequestTo(fetchMock, FILES_ENDPOINT)
            expect(params.get('q')).toBe(
                'sharedWithMe = true and trashed = false',
            )
            expect(params.get('pageToken')).toBe('shared-page-2')
            expect(params.get('supportsAllDrives')).toBe('true')
        })
    })

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
                vi
                    .fn()
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
            expect(results[0]!.name).toBe('a.txt')
            expect(results[1]!.name).toBe('b.txt')
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

            const url = fetchMock.mock.calls[0]![0] as string
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
                vi
                    .fn()
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
            expect(results[0]!.name).toBe('ok.txt')

            const errors = events.filter(e => e.event === 'google-drive:error')
            expect(errors.length).toBeGreaterThanOrEqual(1)
            expect((errors[0]!.payload as { action: string }).action).toBe(
                'downloadFiles',
            )
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
            expect(results[0]!.name).toBe('My Document.docx')
            expect(results[0]!.type).toBe(
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )

            const url = fetchMock.mock.calls[0]![0] as string
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
            expect(results[0]!.name).toBe('My Sheet.xlsx')

            const url = fetchMock.mock.calls[0]![0] as string
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
            expect(results[0]!.name).toBe('My Presentation.pptx')

            const url = fetchMock.mock.calls[0]![0] as string
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
                blob: vi
                    .fn()
                    .mockResolvedValue(
                        new Blob(['png-content'], { type: 'image/png' }),
                    ),
                text: vi.fn().mockResolvedValue(''),
            })
            vi.stubGlobal('fetch', fetchMock)

            const results = await plugin.downloadFiles(driveFiles)

            expect(results).toHaveLength(1)
            expect(results[0]!.name).toBe('My Drawing.png')
            expect(results[0]!.type).toBe('image/png')

            const url = fetchMock.mock.calls[0]![0] as string
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
            expect(results[0]!.name).toBe('Document.docx')
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
                    blob: vi
                        .fn()
                        .mockResolvedValue(
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

            vi.stubGlobal('fetch', mockFetchResponse({ files: [] }))

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
            expect(result.files[0]!.isFolder).toBe(true)
            expect(result.files[0]!.mimeType).toBe('folder')
            expect(result.files[0]!.size).toBe(0)
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
            expect(result.files[0]!.isFolder).toBe(false)
            expect(result.files[0]!.mimeType).toBe('image/jpeg')
            expect(result.files[0]!.size).toBe(2048)
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
            expect(result.files[0]!.isFolder).toBe(false)
            expect(result.files[0]!.mimeType).toBe(
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
            expect(result.files[0]!.thumbnail).toBe(
                'https://thumb.example.com/img',
            )
        })
    })
})
