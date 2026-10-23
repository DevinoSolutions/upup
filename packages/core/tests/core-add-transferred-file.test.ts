import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { FileSource, UploadStatus } from '@useupup/core'
import { ServerModeDriveController } from '../src/controllers/server-mode-drive-controller'

/**
 * T-6094: a server-mode cloud-drive transfer streams provider -> S3 on the
 * server, so the browser never holds the bytes. The transferred file must still
 * land in core.files as a completed row (status SUCCESSFUL, key set) and flip
 * the run to SUCCESSFUL, exactly like a client-mode upload does.
 */

const info = {
    name: 'report.pdf',
    size: 2048,
    type: 'application/pdf',
    key: 'uploads/report.pdf',
    url: 'https://cdn.example/report.pdf',
    source: FileSource.GOOGLE_DRIVE,
}

describe('UpupCore.addTransferredFile', () => {
    it('adds a SUCCESSFUL row with key, real size and source, and completes the run', () => {
        const core = new UpupCore({})
        const onSuccess = vi.fn()
        core.on('upload-success', onSuccess)

        const file = core.addTransferredFile(info)

        expect(core.files.size).toBe(1)
        const stored = [...core.files.values()][0]!
        expect(stored.id).toBe(file.id)
        expect(stored.status).toBe(UploadStatus.SUCCESSFUL)
        expect(stored.key).toBe('uploads/report.pdf')
        expect(stored.size).toBe(2048)
        expect(stored.name).toBe('report.pdf')
        expect(stored.source).toBe(FileSource.GOOGLE_DRIVE)
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
        expect(core.progress).toMatchObject({
            totalFiles: 1,
            completedFiles: 1,
            percentage: 100,
        })
        expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('keeps the real size through a later immutable updateFile transition', () => {
        const core = new UpupCore({})
        core.addTransferredFile(info)
        const [id] = [...core.files.keys()]
        // @ts-expect-error: reaching the manager is the point of this pin
        core.fileManager.updateFile(id, { etag: 'x' })
        expect([...core.files.values()][0]!.size).toBe(2048)
    })

    it('does not mark the run complete while a pending local file remains', async () => {
        const core = new UpupCore({})
        await core.addFiles([new File(['hi'], 'a.txt', { type: 'text/plain' })])
        core.addTransferredFile(info)
        expect(core.status).not.toBe(UploadStatus.SUCCESSFUL)
    })

    it('throws after destroy() (terminal)', () => {
        const core = new UpupCore({})
        core.destroy()
        expect(() => core.addTransferredFile(info)).toThrow()
    })
})

describe('ServerModeDriveController transfer -> core', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('registers the stored file on core after a 200 transfer', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 200,
                ok: true,
                json: async () => ({
                    provider: 'google-drive',
                    key: 'uploads/x.png',
                    name: 'x.png',
                    size: 10,
                    type: 'image/png',
                    url: 'https://cdn.example/x.png',
                }),
            }),
        )
        const core = new UpupCore({})
        const c = new ServerModeDriveController({
            provider: 'google-drive',
            serverUrl: () => 'http://localhost:9999',
            core: () => core,
        })

        const r = await c.transfer({ id: 'f1', name: 'x.png', isFolder: false })

        expect(r.status).toBe('ok')
        const stored = [...core.files.values()]
        expect(stored).toHaveLength(1)
        expect(stored[0]).toMatchObject({
            key: 'uploads/x.png',
            status: UploadStatus.SUCCESSFUL,
            source: FileSource.GOOGLE_DRIVE,
        })
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
    })

    it('adds nothing on a failed transfer', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 500,
                ok: false,
                text: async () => 'boom',
            }),
        )
        const core = new UpupCore({})
        const c = new ServerModeDriveController({
            provider: 'google-drive',
            serverUrl: () => 'http://localhost:9999',
            core: () => core,
        })
        const r = await c.transfer({ id: 'f1', name: 'x.png', isFolder: false })
        expect(r.status).toBe('error')
        expect(core.files.size).toBe(0)
    })
})

describe('ServerModeDriveController.signOut', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('POSTs /files/:provider/logout with credentials and does not force the auto-popup reconnect view', async () => {
        const fetchSpy = vi.fn().mockResolvedValue({ status: 200, ok: true })
        vi.stubGlobal('fetch', fetchSpy)
        const c = new ServerModeDriveController({
            provider: 'one-drive',
            serverUrl: () => 'http://localhost:9999',
        })
        const before = c.getSnapshot().state
        expect(await c.signOut()).toBe(true)
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://localhost:9999/files/one-drive/logout',
            { method: 'POST', credentials: 'include' },
        )
        // 'reauth' mounts DriveAuthFallback, which opens the OAuth popup on mount.
        expect(c.getSnapshot().state).toEqual(before)
    })

    it('surfaces a failed logout as the error view and resolves false', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 500,
                ok: false,
                text: async () => 'nope',
            }),
        )
        const c = new ServerModeDriveController({
            provider: 'box',
            serverUrl: () => 'http://localhost:9999',
        })
        expect(await c.signOut()).toBe(false)
        expect(c.getSnapshot().state).toEqual({
            status: 'error',
            message: 'nope',
        })
    })
})
