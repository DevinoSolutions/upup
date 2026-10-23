import { describe, it, expect, vi, afterEach } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UpupCore } from '../src/core'
import { FileSource } from '../src/types/file-source'
import { ServerModeDriveController } from '../src/controllers/server-mode-drive-controller'

/**
 * A server-mode drive transfer registers an already-stored (key != null,
 * zero-byte) row. The orchestrator's files-added side effects must treat it as
 * done: no auto-upload run, no image-editor auto-open, and the batch callbacks
 * fire off core's upload-all-complete.
 */
const image = {
    name: 'pic.png',
    size: 4096,
    type: 'image/png',
    key: 'uploads/pic.png',
    source: FileSource.GOOGLE_DRIVE,
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('UploaderOrchestrator with completed (transferred) rows', () => {
    it('does not schedule a no-op core.upload() or fire onUploadStart under autoUpload', () => {
        vi.useFakeTimers()
        const core = new UpupCore({})
        const upload = vi.spyOn(core, 'upload')
        const onUploadStart = vi.fn()
        const orch = new UploaderOrchestrator(core, {
            autoUpload: true,
            onUploadStart,
        })
        orch.init()

        core.addTransferredFile(image)
        vi.runAllTimers()

        expect(upload).not.toHaveBeenCalled()
        expect(onUploadStart).not.toHaveBeenCalled()
        orch.destroy()
    })

    it('does not auto-open the image editor for a transferred image', () => {
        const core = new UpupCore({})
        const orch = new UploaderOrchestrator(core, {
            imageEditorOptions: {
                enabled: true,
                autoOpen: 'always',
                display: 'inline',
            },
        })
        orch.init()

        core.addTransferredFile(image)

        expect(orch.getSnapshot().editingFile).toBeNull()
        orch.destroy()
    })

    it('fires onUploadComplete / onFilesUploadComplete once for the transferred batch', async () => {
        const core = new UpupCore({})
        const onUploadComplete = vi.fn()
        const onFilesUploadComplete = vi.fn()
        const orch = new UploaderOrchestrator(core, {
            onUploadComplete,
            onFilesUploadComplete,
        })
        orch.init()

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 200,
                ok: true,
                json: async () => ({
                    key: image.key,
                    name: image.name,
                    size: image.size,
                    type: image.type,
                }),
            }),
        )
        // The drive view transfers the selection, then reports it once.
        const drive = new ServerModeDriveController({
            provider: 'google-drive',
            serverUrl: () => 'http://localhost:9999',
            core: () => core,
        })
        await drive.transfer({ id: 'p', name: image.name, isFolder: false })
        expect(onUploadComplete).not.toHaveBeenCalled()
        drive.finishTransfers()

        expect(onUploadComplete).toHaveBeenCalledTimes(1)
        expect(onFilesUploadComplete).toHaveBeenCalledTimes(1)
        orch.destroy()
    })
})
