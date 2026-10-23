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

    it('rejects a second transfer of the same drive file or the same key (file-rejected)', () => {
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
        expect(core.addTransferredFile(info)).toBeUndefined()

        expect(core.files.size).toBe(1)
        expect(rejected).toHaveBeenCalledTimes(2)
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
            code: UpupErrorCode.FILE_TOO_LARGE,
        })
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
            code: UpupErrorCode.LIMIT_EXCEEDED,
        })
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
            code: UpupErrorCode.DUPLICATE,
        })
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

describe('addTransferredFile completion events', () => {
    it('emits upload-all-complete once when every row is complete', () => {
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)

        core.addTransferredFile(info)

        expect(done).toHaveBeenCalledTimes(1)
        expect(done.mock.calls[0]![0]).toHaveLength(1)
    })

    it('does not emit upload-all-complete while a pending local file remains', async () => {
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        await core.addFiles([new File(['hi'], 'a.txt', { type: 'text/plain' })])

        core.addTransferredFile(info)

        expect(done).not.toHaveBeenCalled()
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
