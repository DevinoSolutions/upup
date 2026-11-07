import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { GoogleDrivePlugin } from '../src/drives/google-drive-plugin'
import type { DriveFile } from '../src/drives/types'
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
