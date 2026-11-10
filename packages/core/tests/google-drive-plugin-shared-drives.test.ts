import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import {
    GoogleDrivePlugin,
    SHARED_WITH_ME_FOLDER_ID,
} from '../src/drives/google-drive-plugin'
import {
    captureEvents,
    mockFetchResponse,
    requestsTo,
    firstRequestTo,
    mockFetchSequence,
    makeDriveFile,
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
})
