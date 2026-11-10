import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../src/events'
import { GoogleDrivePlugin } from '../src/drives/google-drive-plugin'
import {
    captureEvents,
    mockFetchResponse,
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
})
