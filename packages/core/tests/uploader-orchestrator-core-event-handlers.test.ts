import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UpupCore } from '../src/core'
import { UploadStatus } from '../src/types/upload-status'
import { UpupStorageError } from '../src/errors'
import {
    createMockCore,
    createMockCoreWithHandlers,
    createUploadFile,
} from './helpers/uploader-orchestrator-fixtures'

describe('UploaderOrchestrator', () => {
    // ── Lifecycle (init / destroy) ──────────────────────────────────

    describe('init', () => {
        it('subscribes to all expected core events', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()

            const subscribedEvents = (
                core.on as ReturnType<typeof vi.fn>
            ).mock.calls.map((call: unknown[]) => call[0])
            expect(subscribedEvents).toContain('upload-start')
            expect(subscribedEvents).toContain('file-upload-start')
            // state-change drives the files projection (replaces files-cleared map mirror)
            expect(subscribedEvents).toContain('state-change')
            expect(subscribedEvents).toContain('files-added')
            expect(subscribedEvents).toContain('file-removed')
            // files-cleared is NO longer subscribed (state-change handles it)
            expect(subscribedEvents).not.toContain('files-cleared')
            expect(subscribedEvents).toContain('upload-progress')
            expect(subscribedEvents).toContain('upload-success')
            expect(subscribedEvents).toContain('upload-all-complete')
            expect(subscribedEvents).toContain('upload-error')
        })

        describe('upload-start handler', () => {
            it('calls onUploadStart and does NOT itself write uploadStatus (projection owns it)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onUploadStart = vi.fn()
                const orch = new UploaderOrchestrator(core, { onUploadStart })
                orch.init()

                const before = orch.getSnapshot().uploadStatus
                handlers['upload-start']!({})

                expect(onUploadStart).toHaveBeenCalledTimes(1)
                // uploadStatus now arrives via state-change{status}, not the discrete listener.
                expect(orch.getSnapshot().uploadStatus).toBe(before)
            })
        })

        describe('file-upload-start handler', () => {
            it('calls onFileUploadStart with the file', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileUploadStart = vi.fn()
                const orch = new UploaderOrchestrator(core, {
                    onFileUploadStart,
                })
                orch.init()

                const file = createUploadFile({ name: 'test.txt' })
                handlers['file-upload-start']!({ file })

                expect(onFileUploadStart).toHaveBeenCalledWith(file)
            })
        })

        describe('files-added handler', () => {
            // Note: map-merge assertions for files-added are superseded by the
            // "files projection reflects ALL core file mutations (Tier 3.1)" suite
            // (specifically "reflects core.addFiles"). The files-added handler is
            // now side-effects only; the map is owned by state-change.

            it('calls onFilesSelected callback', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFilesSelected = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFilesSelected })
                orch.init()

                const files = [createUploadFile({ name: 'a.txt', id: 'a' })]
                handlers['files-added']!(files)

                expect(onFilesSelected).toHaveBeenCalledWith(files)
            })

            it('skips empty arrays', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFilesSelected = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFilesSelected })
                orch.init()

                handlers['files-added']!([])

                expect(onFilesSelected).not.toHaveBeenCalled()
                expect(orch.getSnapshot().files.size).toBe(0)
            })

            it('enqueues images for editor when autoOpen is always', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {
                    imageEditorOptions: {
                        enabled: true,
                        autoOpen: 'always',
                        display: 'inline',
                    },
                })
                orch.init()

                const img = createUploadFile({
                    name: 'photo.png',
                    id: 'img1',
                    type: 'image/png',
                })
                const txt = createUploadFile({
                    name: 'doc.txt',
                    id: 'txt1',
                    type: 'text/plain',
                })
                handlers['files-added']!([img, txt])

                // Image should be opened in editor (auto-opened from queue)
                expect(orch.getSnapshot().editingFile).toBe(img)
            })

            it('enqueues single image for editor when autoOpen is single', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {
                    imageEditorOptions: {
                        enabled: true,
                        autoOpen: 'single',
                        display: 'inline',
                    },
                })
                orch.init()

                const img = createUploadFile({
                    name: 'photo.png',
                    id: 'img1',
                    type: 'image/png',
                })
                handlers['files-added']!([img])

                expect(orch.getSnapshot().editingFile).toBe(img)
            })

            it('does not auto-open when autoOpen is single but multiple images added', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {
                    imageEditorOptions: {
                        enabled: true,
                        autoOpen: 'single',
                        display: 'inline',
                    },
                })
                orch.init()

                const img1 = createUploadFile({
                    name: 'a.png',
                    id: 'a',
                    type: 'image/png',
                })
                const img2 = createUploadFile({
                    name: 'b.png',
                    id: 'b',
                    type: 'image/png',
                })
                handlers['files-added']!([img1, img2])

                // Nothing opened because 2 images with 'single' mode
                expect(orch.getSnapshot().editingFile).toBeNull()
            })

            it('triggers auto-upload when enabled', () => {
                vi.useFakeTimers()
                const { core, handlers } = createMockCoreWithHandlers()
                core.upload = vi.fn().mockResolvedValue([])
                const orch = new UploaderOrchestrator(core, {
                    autoUpload: true,
                })
                orch.init()

                const file = createUploadFile({ name: 'a.txt', id: 'a' })
                handlers['files-added']!([file])

                expect(core.emit).toHaveBeenCalledWith('auto-upload', {
                    count: 1,
                })

                vi.runAllTimers()
                expect(core.upload).toHaveBeenCalled()
                vi.useRealTimers()
            })

            it('does NOT auto-upload after orch.destroy() races the 0-ms timer (F-148 companion)', () => {
                vi.useFakeTimers()
                const { core, handlers } = createMockCoreWithHandlers()
                core.upload = vi.fn().mockResolvedValue([])
                const orch = new UploaderOrchestrator(core, {
                    autoUpload: true,
                })
                orch.init()

                const file = createUploadFile({ name: 'a.txt', id: 'a' })
                handlers['files-added']!([file]) // schedules the 0-ms auto-upload timer
                orch.destroy() // unmount before the timer fires
                vi.runAllTimers()

                expect(core.upload).not.toHaveBeenCalled()
                vi.useRealTimers()
            })

            // totalBytes is now computed in projectFromCore (owned by state-change).
            // Coverage for totalBytes correctness is provided by the integration tests
            // in "files projection reflects ALL core file mutations (Tier 3.1)" which
            // use real core and verify the full projected state.
        })

        describe('file-removed handler', () => {
            it('calls onFileRemoved callback', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileRemoved = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFileRemoved })
                orch.init()

                const file = createUploadFile({ name: 'removed.txt' })
                handlers['file-removed']!(file)

                expect(onFileRemoved).toHaveBeenCalledWith(file)
            })

            // "mirrors removal into state" is superseded by the real-core integration
            // test "mirrors a direct core.removeFile into orchestrator state" below,
            // and by the Tier 3.1 "empties on core.removeAll" projection test.
            // The file-removed handler is now callback-only; map updates are owned
            // by the state-change → rebuildFilesProjection path.

            it('fires onFileRemoved even when file is not in orchestrator state', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileRemoved = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFileRemoved })
                orch.init()

                const listener = vi.fn()
                orch.subscribe(listener)
                const ghost = createUploadFile({
                    name: 'ghost.txt',
                    id: 'ghost',
                })
                handlers['file-removed']!(ghost)

                // file-removed handler is callback-only — no setState, so no notify
                expect(listener).not.toHaveBeenCalled()
                expect(onFileRemoved).toHaveBeenCalledWith(ghost)
            })
        })

        // files-cleared handler has been removed. The state-change listener
        // (rebuildFilesProjection) handles the clear triggered by core.removeAll().
        // Coverage: "files projection reflects ALL core file mutations (Tier 3.1)"
        // → "empties on core.removeAll" (real core, verified end-to-end).

        describe('upload-progress handler', () => {
            it('updates filesProgressMap and uploadedBytes', () => {
                const { core, handlers } = createMockCoreWithHandlers({
                    totalFiles: 1,
                    completedFiles: 0,
                    percentage: 50,
                })
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['upload-progress']!({
                    fileId: 'f1',
                    loaded: 500,
                    total: 1000,
                })

                const state = orch.getSnapshot()
                expect(state.filesProgressMap['f1']).toEqual({
                    id: 'f1',
                    loaded: 500,
                    total: 1000,
                })
                expect(state.uploadedBytes).toBe(500)
            })

            it('calls onFileUploadProgress with progress info', async () => {
                // Use real core so the files map is populated via state-change projection
                const core = new UpupCore({})
                const onFileUploadProgress = vi.fn()
                const orch = new UploaderOrchestrator(core, {
                    onFileUploadProgress,
                })
                orch.init()

                // Seed a file via real core so orchestrator projection reflects it
                await core.addFiles([
                    new File(['data'], 'a.txt', { type: 'text/plain' }),
                ])
                const [fileId, file] = [
                    ...orch.getSnapshot().files.entries(),
                ][0]!

                // Simulate the upload-progress event directly on core
                core.emit('upload-progress', {
                    fileId,
                    loaded: 300,
                    total: 1000,
                })

                expect(onFileUploadProgress).toHaveBeenCalledWith(file, {
                    loaded: 300,
                    total: 1000,
                    percentage: 30,
                })
                core.destroy()
            })

            it('calls onFilesUploadProgress with core progress', () => {
                const { core, handlers } = createMockCoreWithHandlers({
                    totalFiles: 2,
                    completedFiles: 1,
                    percentage: 50,
                })
                const onFilesUploadProgress = vi.fn()
                const orch = new UploaderOrchestrator(core, {
                    onFilesUploadProgress,
                })
                orch.init()

                handlers['upload-progress']!({
                    fileId: 'f1',
                    loaded: 500,
                    total: 1000,
                })

                expect(onFilesUploadProgress).toHaveBeenCalledWith(1, 2)
            })
        })

        describe('upload-success handler', () => {
            it('calls onFileUploadComplete with file and key', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileUploadComplete = vi.fn()
                const orch = new UploaderOrchestrator(core, {
                    onFileUploadComplete,
                })
                orch.init()

                const file = createUploadFile({ name: 'a.txt' })
                handlers['upload-success']!({
                    file,
                    result: { key: 'uploads/a.txt' },
                })

                expect(onFileUploadComplete).toHaveBeenCalledWith(
                    file,
                    'uploads/a.txt',
                )
            })

            it('falls back to file.key when result has no key', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileUploadComplete = vi.fn()
                const orch = new UploaderOrchestrator(core, {
                    onFileUploadComplete,
                })
                orch.init()

                const file = Object.assign(
                    createUploadFile({ name: 'a.txt' }),
                    { key: 'fallback-key' },
                )
                handlers['upload-success']!({ file, result: {} })

                expect(onFileUploadComplete).toHaveBeenCalledWith(
                    file,
                    'fallback-key',
                )
            })
        })

        describe('upload-all-complete handler', () => {
            it('does NOT itself write uploadStatus (projection owns it)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                const before = orch.getSnapshot().uploadStatus
                handlers['upload-all-complete']!([])

                // SUCCESSFUL now arrives via the state-change{status} core emits alongside.
                expect(orch.getSnapshot().uploadStatus).toBe(before)
            })

            it('calls onFilesUploadComplete and onUploadComplete', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFilesUploadComplete = vi.fn()
                const onUploadComplete = vi.fn()
                const orch = new UploaderOrchestrator(core, {
                    onFilesUploadComplete,
                    onUploadComplete,
                })
                orch.init()

                const files = [createUploadFile({ name: 'a.txt' })]
                handlers['upload-all-complete']!(files)

                expect(onFilesUploadComplete).toHaveBeenCalledWith(files)
                expect(onUploadComplete).toHaveBeenCalledWith(files)
            })
        })

        describe('upload-error handler', () => {
            it('sets uploadError message but does NOT itself write uploadStatus (projection owns it)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                const before = orch.getSnapshot().uploadStatus
                handlers['upload-error']!({
                    error: new Error('Network failure'),
                })

                expect(orch.getSnapshot().uploadError).toBe('Network failure')
                // FAILED now arrives via the state-change{status: FAILED} core emits right after.
                expect(orch.getSnapshot().uploadStatus).toBe(before)
            })

            it('calls onError callback', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onError = vi.fn()
                const orch = new UploaderOrchestrator(core, { onError })
                orch.init()

                handlers['upload-error']!({ error: new Error('Timeout') })

                expect(onError).toHaveBeenCalledWith('Timeout')
            })

            it('sets uploadErrorCode from a typed UpupStorageError (P4/C9)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                const err = new UpupStorageError(
                    'Signature mismatch',
                    'S3',
                    'upload',
                )
                err.code = 'SignatureDoesNotMatch'
                handlers['upload-error']!({ error: err })

                expect(orch.getSnapshot().uploadError).toBe(
                    'Signature mismatch',
                )
                expect(orch.getSnapshot().uploadErrorCode).toBe(
                    'SignatureDoesNotMatch',
                )
            })

            it('leaves uploadErrorCode undefined for a plain Error (no code)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['upload-error']!({ error: new Error('plain failure') })

                expect(orch.getSnapshot().uploadErrorCode).toBeUndefined()
            })
        })

        // ── F-145: uploadStatus is a projection of core's state-change{status} ──
        describe('uploadStatus projection (F-145)', () => {
            it('state-change{status} drives uploadStatus for every status', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                for (const status of [
                    UploadStatus.PROCESSING,
                    UploadStatus.UPLOADING,
                    UploadStatus.SUCCESSFUL,
                    UploadStatus.FAILED,
                    UploadStatus.PAUSED,
                    UploadStatus.IDLE,
                ]) {
                    handlers['state-change']!({ status })
                    expect(orch.getSnapshot().uploadStatus).toBe(status)
                }
            })

            it('a state-change without a status leaves uploadStatus unchanged', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['state-change']!({ status: UploadStatus.UPLOADING })
                handlers['state-change']!({}) // e.g. a files-only or progress-only change
                expect(orch.getSnapshot().uploadStatus).toBe(
                    UploadStatus.UPLOADING,
                )
            })

            it('there is exactly ONE writer of uploadStatus (the discrete listeners do not touch it)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['state-change']!({ status: UploadStatus.UPLOADING })
                handlers['upload-start']!({})
                handlers['upload-all-complete']!([])
                handlers['upload-error']!({ error: new Error('x') })
                // None of the three discrete listeners moved uploadStatus off UPLOADING.
                expect(orch.getSnapshot().uploadStatus).toBe(
                    UploadStatus.UPLOADING,
                )
            })
        })

        // ── F-145: real core ⇄ orchestrator — pause/resume/cancel now propagate ──
        describe('real-core status convergence (F-145)', () => {
            const makeRealCore = () =>
                new UpupCore({
                    provider: 'aws',
                    uploadEndpoint: '/api/presign',
                })
            const realFile = (name: string) =>
                new File(['x'], name, { type: 'text/plain' })

            it('core.pause() → orchestrator PAUSED', () => {
                const core = makeRealCore()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()
                core.pause()
                expect(orch.getSnapshot().uploadStatus).toBe(
                    UploadStatus.PAUSED,
                )
                orch.destroy()
            })

            it('core.resume() → orchestrator UPLOADING', () => {
                const core = makeRealCore()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()
                core.resume()
                expect(orch.getSnapshot().uploadStatus).toBe(
                    UploadStatus.UPLOADING,
                )
                orch.destroy()
            })

            it('upload-then-cancel resets uploadStatus to IDLE (no stale SUCCESSFUL over empty list)', async () => {
                const core = makeRealCore()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()
                await core.addFiles([realFile('a.txt')])
                orch.handleCancel()
                expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.IDLE)
                expect(orch.getSnapshot().files.size).toBe(0)
                orch.destroy()
            })
        })
    })
})
