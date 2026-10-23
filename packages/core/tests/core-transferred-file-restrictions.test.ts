import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { FileSource, UpupErrorCode } from '@useupup/core'
import { ServerModeDriveController } from '../src/controllers/server-mode-drive-controller'

/**
 * A server-mode transfer bypasses addFiles, so the client restrictions (limit,
 * maxFileSize, duplicates) must be enforced on the transferred-file path: the
 * controller pre-checks BEFORE the server round-trip, and addTransferredFile
 * re-checks defensively after storage. Rejections use core's existing channel
 * (restriction-failed / file-rejected), the same one addFiles emits on.
 */
const info = {
    name: 'report.pdf',
    size: 2048,
    type: 'application/pdf',
    key: 'uploads/report.pdf',
    source: FileSource.GOOGLE_DRIVE,
}

const fetchOk = (body: unknown) =>
    vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => body,
    })

const controllerFor = (core: UpupCore) =>
    new ServerModeDriveController({
        provider: 'google-drive',
        serverUrl: () => 'http://localhost:9999',
        core: () => core,
    })

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('addTransferredFile restrictions', () => {
    it('rejects a row past `limit` and emits restriction-failed', () => {
        const core = new UpupCore({ limit: 1 })
        const failed = vi.fn()
        core.on('restriction-failed', failed)

        expect(core.addTransferredFile(info)).toBeDefined()
        expect(
            core.addTransferredFile({ ...info, key: 'uploads/b.pdf' }),
        ).toBeUndefined()

        expect(core.files.size).toBe(1)
        expect(failed).toHaveBeenCalledTimes(1)
        expect(failed.mock.calls[0]![0].error.code).toBe(
            UpupErrorCode.LIMIT_EXCEEDED,
        )
    })

    it('rejects a transfer over maxFileSize', () => {
        const core = new UpupCore({ maxFileSize: { size: 1, unit: 'B' } })
        const failed = vi.fn()
        core.on('restriction-failed', failed)

        expect(core.addTransferredFile(info)).toBeUndefined()

        expect(core.files.size).toBe(0)
        expect(failed.mock.calls[0]![0].error.code).toBe(
            UpupErrorCode.FILE_TOO_LARGE,
        )
    })

    it('rejects a second transfer of the same drive file (file-rejected)', () => {
        const core = new UpupCore({ contentDeduplication: true })
        const rejected = vi.fn()
        core.on('file-rejected', rejected)

        core.addTransferredFile({ ...info, driveId: 'google-drive:f1' })
        expect(
            core.addTransferredFile({
                ...info,
                key: 'uploads/other.pdf',
                driveId: 'google-drive:f1',
            }),
        ).toBeUndefined()

        expect(core.files.size).toBe(1)
        expect(rejected).toHaveBeenCalledTimes(1)
        expect(rejected).toHaveBeenCalledWith({ count: 1 })
    })
})

describe('ServerModeDriveController transfer pre-check', () => {
    it('rejects an oversize file BEFORE the server round-trip with a typed error', async () => {
        const fetchSpy = fetchOk({})
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ maxFileSize: { size: 1, unit: 'B' } })
        const failed = vi.fn()
        core.on('restriction-failed', failed)

        const r = await controllerFor(core).transfer({
            id: 'f1',
            name: 'big.bin',
            size: 999_999,
            isFolder: false,
        })

        expect(fetchSpy).not.toHaveBeenCalled()
        expect(r).toMatchObject({
            status: 'error',
            message: expect.stringContaining('big.bin'),
        })
        expect(r).not.toHaveProperty('code')
        expect(failed).toHaveBeenCalledTimes(1)
        expect(core.files.size).toBe(0)
    })

    it('counts existing rows against `limit`', async () => {
        const fetchSpy = fetchOk({})
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ limit: 1 })
        core.addTransferredFile(info)

        const r = await controllerFor(core).transfer({
            id: 'f2',
            name: 'b.pdf',
            isFolder: false,
        })

        expect(fetchSpy).not.toHaveBeenCalled()
        expect(r).toMatchObject({
            status: 'error',
            message: expect.stringContaining('limit'),
        })
        expect(r).not.toHaveProperty('code')
    })

    it('rejects a drive file already transferred (contentDeduplication on)', async () => {
        const fetchSpy = fetchOk({
            key: 'uploads/x.png',
            name: 'x.png',
            size: 10,
            type: 'image/png',
        })
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ contentDeduplication: true })
        const c = controllerFor(core)
        const file = { id: 'f1', name: 'x.png', isFolder: false }

        expect((await c.transfer(file)).status).toBe('ok')
        const second = await c.transfer(file)

        expect(second).toMatchObject({
            status: 'error',
            message: expect.stringContaining('already added'),
        })
        expect(second).not.toHaveProperty('code')
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(core.files.size).toBe(1)
    })

    it('still yields ok when core throws after storage (destroyed mid-transfer)', async () => {
        const core = new UpupCore({})
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(async () => {
                core.destroy()
                return {
                    status: 200,
                    ok: true,
                    json: async () => ({
                        key: 'uploads/x.png',
                        name: 'x.png',
                        size: 10,
                        type: 'image/png',
                    }),
                }
            }),
        )
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const r = await controllerFor(core).transfer({
            id: 'f1',
            name: 'x.png',
            isFolder: false,
        })

        expect(r.status).toBe('ok')
        expect(warn).toHaveBeenCalledTimes(1)
        warn.mockRestore()
    })
})

describe('ServerModeDriveController unknown size/type and post-storage rejection', () => {
    const stored = (size: number, type = 'application/pdf', name = 'x.bin') =>
        fetchOk({ key: 'uploads/x.bin', name, size, type })

    it('rejects when the real stored size breaks maxFileSize but the listing had none: error result, 0 rows', async () => {
        const fetchSpy = stored(5000)
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ maxFileSize: { size: 5, unit: 'B' } })
        const failed = vi.fn()
        core.on('restriction-failed', failed)

        const r = await controllerFor(core).transfer({
            id: 'f1',
            name: 'x.bin',
            isFolder: false,
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(r).toMatchObject({
            status: 'error',
            message: expect.stringContaining('x.bin'),
        })
        expect(failed).toHaveBeenCalledTimes(1)
        expect(core.files.size).toBe(0)
    })

    it('does not pre-reject an unknown size against minFileSize', async () => {
        const fetchSpy = stored(5000)
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ minFileSize: { size: 100, unit: 'B' } })

        const r = await controllerFor(core).transfer({
            id: 'f1',
            name: 'x.bin',
            isFolder: false,
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(r.status).toBe('ok')
        expect(core.files.size).toBe(1)
    })

    it('does not pre-reject a missing mimeType against a MIME-only accept', async () => {
        const fetchSpy = stored(10, 'image/png')
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ allowedFileTypes: 'image/*' })

        const r = await controllerFor(core).transfer({
            id: 'f1',
            name: 'pic',
            isFolder: false,
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(r.status).toBe('ok')
    })

    it('falls back to the filename extension when accept lists extensions and the type is unknown', async () => {
        const fetchSpy = stored(10, 'image/png', 'a.png')
        vi.stubGlobal('fetch', fetchSpy)
        const core = new UpupCore({ allowedFileTypes: '.png' })
        const c = controllerFor(core)

        const bad = await c.transfer({
            id: 'f1',
            name: 'a.txt',
            isFolder: false,
        })
        expect(bad.status).toBe('error')
        expect(fetchSpy).not.toHaveBeenCalled()

        const good = await c.transfer({
            id: 'f2',
            name: 'a.png',
            isFolder: false,
        })
        expect(good.status).toBe('ok')
    })

    it('shows the parsed {error} of a failed transfer, not the raw JSON body', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 500,
                ok: false,
                text: async () => '{"error":"boom"}',
            }),
        )

        const r = await controllerFor(new UpupCore({})).transfer({
            id: 'f1',
            name: 'x.bin',
            isFolder: false,
        })

        expect(r).toEqual({ status: 'error', message: 'boom' })
    })
})

describe('transfer batch completion (finishTransfers)', () => {
    // Each fetch answers with the requested file's own key, like the server.
    const stubTransfers = (failIds: string[] = []) =>
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_url: string, init: { body: string }) => {
                const { fileId, fileName } = JSON.parse(init.body) as {
                    fileId: string
                    fileName: string
                }
                if (failIds.includes(fileId))
                    return { status: 500, ok: false, text: async () => 'boom' }
                return {
                    status: 200,
                    ok: true,
                    json: async () => ({
                        key: `uploads/${fileId}`,
                        name: fileName,
                        size: 10,
                        type: 'application/pdf',
                    }),
                }
            }),
        )
    const file = (id: string) => ({
        id,
        name: `${id}.pdf`,
        isFolder: false as const,
    })
    const keysOf = (call: unknown[]) =>
        (call[0] as Array<{ key: string }>).map(f => f.key).sort()

    it('addTransferredFile itself never emits upload-all-complete (per-file upload-success only)', () => {
        const core = new UpupCore({})
        const done = vi.fn()
        const success = vi.fn()
        core.on('upload-all-complete', done)
        core.on('upload-success', success)

        core.addTransferredFile(info)

        expect(success).toHaveBeenCalledTimes(1)
        expect(done).not.toHaveBeenCalled()
    })

    it('3 transfers in one selection -> ONE emission carrying all 3 files', async () => {
        stubTransfers()
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        const c = controllerFor(core)

        await c.transfer(file('a'))
        await c.transfer(file('b'))
        await c.transfer(file('c'))
        expect(done).not.toHaveBeenCalled()
        c.finishTransfers()

        expect(done).toHaveBeenCalledTimes(1)
        expect(keysOf(done.mock.calls[0]!)).toEqual([
            'uploads/a',
            'uploads/b',
            'uploads/c',
        ])
    })

    it('a later selection emits again, once, with the whole completed set (like a continued normal run)', async () => {
        stubTransfers()
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        const c = controllerFor(core)

        await c.transfer(file('a'))
        c.finishTransfers()
        c.finishTransfers() // nothing new since the last finish
        await c.transfer(file('b'))
        c.finishTransfers()

        expect(done).toHaveBeenCalledTimes(2)
        expect(keysOf(done.mock.calls[0]!)).toEqual(['uploads/a'])
        expect(keysOf(done.mock.calls[1]!)).toEqual(['uploads/a', 'uploads/b'])
    })

    it('no emission when every transfer in the selection failed', async () => {
        stubTransfers(['a', 'b'])
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        const c = controllerFor(core)

        await c.transfer(file('a'))
        await c.transfer(file('b'))
        c.finishTransfers()

        expect(done).not.toHaveBeenCalled()
    })

    it('no emission while a pending local file remains', async () => {
        stubTransfers()
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        await core.addFiles([new File(['hi'], 'a.txt', { type: 'text/plain' })])
        const c = controllerFor(core)

        await c.transfer(file('a'))
        c.finishTransfers()

        expect(done).not.toHaveBeenCalled()
    })
})

describe('type-less file rejection message', () => {
    it('names the file instead of printing an empty type', () => {
        const core = new UpupCore({ allowedFileTypes: '.png' })

        const error = core.checkTransferredFile({
            name: 'notes.txt',
            driveId: 'google-drive:n',
        })

        expect(error?.message).toContain('notes.txt')
        expect(error?.message).not.toContain('""')
    })
})

describe('ServerModeDriveController.signOut failures', () => {
    const signOutWith = (status: number, body: string) => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status,
                ok: false,
                text: async () => body,
            }),
        )
        const c = new ServerModeDriveController({
            provider: 'box',
            serverUrl: () => 'http://localhost:9999',
        })
        return c
    }

    it('treats 401 as already logged out', async () => {
        const c = signOutWith(401, '{"error":"Unauthenticated"}')
        expect(await c.signOut()).toBe(true)
        expect(c.getSnapshot().state.status).not.toBe('error')
    })

    it('shows the parsed {error} message, not the raw JSON body', async () => {
        const c = signOutWith(500, '{"error":"tokenStore is required"}')
        expect(await c.signOut()).toBe(false)
        expect(c.getSnapshot().state).toEqual({
            status: 'error',
            message: 'tokenStore is required',
        })
    })
})
