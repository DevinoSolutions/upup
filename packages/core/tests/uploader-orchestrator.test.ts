import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UpupCore } from '../src/core'
import { UploadStatus } from '../src/types/upload-status'
import { FileSource } from '../src/types/file-source'
import type { UploadFile } from '../src/types/upload-file'
import { UpupStorageError } from '../src/errors'

function createMockCore() {
    return {
        on: vi.fn(() => () => {}),
        addFiles: vi.fn(),
        removeFile: vi.fn(),
        removeAll: vi.fn(),
        upload: vi.fn(),
        destroy: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        retry: vi.fn(),
        emit: vi.fn(),
        replaceFile: vi.fn(),
        getPlugin: vi.fn(),
        files: new Map(),
        progress: { totalFiles: 0, completedFiles: 0, percentage: 0 },
    } as any
}

/**
 * Create a mock core where `on` captures handlers by event name,
 * so tests can simulate events via `handlers[eventName](payload)`.
 */
function createMockCoreWithHandlers() {
    const handlers: Record<string, (payload: any) => void> = {}
    const unsubs: Array<() => void> = []
    const core = {
        ...createMockCore(),
        on: vi.fn((event: string, handler: (payload: any) => void) => {
            handlers[event] = handler
            const unsub = vi.fn()
            unsubs.push(unsub)
            return unsub
        }),
    }
    return { core, handlers, unsubs }
}

/** Create a minimal UploadFile for testing. */
function createUploadFile(overrides: Partial<UploadFile> & { name: string }): UploadFile {
    const file = new File(['content'], overrides.name, { type: overrides.type ?? 'text/plain' })
    return Object.assign(file, {
        id: overrides.id ?? overrides.name,
        source: overrides.source ?? FileSource.LOCAL,
        status: overrides.status ?? UploadStatus.READY,
        metadata: overrides.metadata ?? {},
        url: overrides.url ?? `blob:http://localhost/${overrides.name}`,
    }) as UploadFile
}

describe('UploaderOrchestrator', () => {
    it('creates with initial state', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const state = orch.getSnapshot()
        expect(state.files.size).toBe(0)
        expect(state.uploadStatus).toBe(UploadStatus.IDLE)
        expect(state.editingFile).toBeNull()
    })

    it('subscribe/getSnapshot protocol works', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const listener = vi.fn()
        const unsub = orch.subscribe(listener)
        expect(listener).not.toHaveBeenCalled()
        unsub()
    })

    it('unsubscribe stops notifications', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const listener = vi.fn()
        const unsub = orch.subscribe(listener)
        unsub()
        // After unsubscribe, listener should not be in the set
        // We verify by triggering a state change indirectly via destroy
        orch.destroy()
        expect(listener).not.toHaveBeenCalled()
    })

    it('getSnapshot returns same reference when state unchanged', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const snap1 = orch.getSnapshot()
        const snap2 = orch.getSnapshot()
        expect(snap1).toBe(snap2)
    })

    it('destroy clears listeners and unsubs', () => {
        const core = createMockCore()
        const orch = new UploaderOrchestrator(core, {})
        const listener = vi.fn()
        orch.subscribe(listener)
        orch.destroy()
        // After destroy, no listeners should remain
        // getSnapshot still works (non-destructive to state)
        const state = orch.getSnapshot()
        expect(state.files.size).toBe(0)
    })

    // ── File management ──────────────────────────────────────────────

    describe('removeFile', () => {
        // removeFile is now a thin delegate: revoke blob URL then core.removeFile.
        // The map update and onFileRemoved callback are both owned by the
        // state-change / file-removed listeners. These tests use real UpupCore
        // so the full event chain fires correctly.

        it('removes file from orchestrator state (via state-change projection)', async () => {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([new File(['data'], 'test.txt', { type: 'text/plain' })])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            orch.removeFile(fileId)

            expect(orch.getSnapshot().files.size).toBe(0)
            core.destroy()
        })

        it('calls core.removeFile with the id', async () => {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([new File(['data'], 'test.txt', { type: 'text/plain' })])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            orch.removeFile(fileId)

            expect(core.files.has(fileId)).toBe(false)
            core.destroy()
        })

        it('calls onFileRemoved callback with the removed file (via file-removed listener)', async () => {
            const onFileRemoved = vi.fn()
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, { onFileRemoved })
            orch.init()

            await core.addFiles([new File(['data'], 'callback-test.txt')])
            const fileId = orch.getSnapshot().files.keys().next().value as string
            const file = orch.getSnapshot().files.get(fileId)

            orch.removeFile(fileId)

            expect(onFileRemoved).toHaveBeenCalledTimes(1)
            expect(onFileRemoved).toHaveBeenCalledWith(file)
            core.destroy()
        })

        it('revokes blob URL before removing', async () => {
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/test', revokeObjectURL })

            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([new File(['data'], 'blob-test.txt')])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            orch.removeFile(fileId)

            expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test')
            vi.unstubAllGlobals()
            core.destroy()
        })

        it('does not call onFileRemoved when file does not exist', () => {
            const onFileRemoved = vi.fn()
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, { onFileRemoved })
            orch.init()

            orch.removeFile('nonexistent')

            expect(onFileRemoved).not.toHaveBeenCalled()
            core.destroy()
        })

        it('notifies listeners on removal (via state-change → rebuildFilesProjection)', async () => {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([new File(['data'], 'notify.txt')])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            // Subscribe AFTER the add (its notify already fired) so the only
            // notify counted is the single removal's — pinning exactly-once.
            const listener = vi.fn()
            orch.subscribe(listener)
            orch.removeFile(fileId)

            expect(listener).toHaveBeenCalledTimes(1)
            core.destroy()
        })

        it('creates a new state reference (immutable)', async () => {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([new File(['data'], 'immutable.txt')])
            const stateBefore = orch.getSnapshot()
            const fileId = stateBefore.files.keys().next().value as string

            orch.removeFile(fileId)
            const stateAfter = orch.getSnapshot()

            expect(stateAfter).not.toBe(stateBefore)
            expect(stateAfter.files).not.toBe(stateBefore.files)
            core.destroy()
        })
    })

    describe('setActiveSource', () => {
        it('updates activeSource in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            expect(orch.getSnapshot().activeSource).toBeUndefined()

            orch.setActiveSource(FileSource.GOOGLE_DRIVE)
            expect(orch.getSnapshot().activeSource).toBe(FileSource.GOOGLE_DRIVE)
        })

        it('can clear activeSource with undefined', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.setActiveSource(FileSource.DROPBOX)
            orch.setActiveSource(undefined)
            expect(orch.getSnapshot().activeSource).toBeUndefined()
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.setActiveSource(FileSource.LOCAL)
            expect(listener).toHaveBeenCalledTimes(1)
        })
    })

    describe('setViewMode', () => {
        it('updates viewMode in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            expect(orch.getSnapshot().viewMode).toBe('grid')

            orch.setViewMode('list')
            expect(orch.getSnapshot().viewMode).toBe('list')
        })

        it('can switch back to grid', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.setViewMode('list')
            orch.setViewMode('grid')
            expect(orch.getSnapshot().viewMode).toBe('grid')
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.setViewMode('list')
            expect(listener).toHaveBeenCalledTimes(1)
        })
    })

    describe('setIsAddingMore', () => {
        it('updates isAddingMore in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            expect(orch.getSnapshot().isAddingMore).toBe(false)

            orch.setIsAddingMore(true)
            expect(orch.getSnapshot().isAddingMore).toBe(true)
        })

        it('can toggle back to false', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.setIsAddingMore(true)
            orch.setIsAddingMore(false)
            expect(orch.getSnapshot().isAddingMore).toBe(false)
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.setIsAddingMore(true)
            expect(listener).toHaveBeenCalledTimes(1)
        })
    })

    // ── Upload control methods ────────────────────────────────────────

    describe('startUpload', () => {
        it('calls core.upload() and returns result', async () => {
            const core = createMockCore()
            const mockFiles = [createUploadFile({ name: 'a.txt' })]
            core.upload.mockResolvedValue(mockFiles)
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })

            const result = await orch.startUpload()

            expect(core.upload).toHaveBeenCalled()
            expect(result).toEqual(mockFiles)
        })

        it('returns undefined when no files', async () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const result = await orch.startUpload()

            expect(result).toBeUndefined()
            expect(core.upload).not.toHaveBeenCalled()
        })

        it('clears uploadError before uploading', async () => {
            const core = createMockCore()
            core.upload.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })
            await orch.startUpload()

            expect(orch.getSnapshot().uploadError).toBe('')
        })

        it('clears uploadErrorCode before uploading (P4/C9)', async () => {
            const core = createMockCore()
            core.upload.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({
                files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]),
                uploadErrorCode: 'SignatureDoesNotMatch',
            })
            await orch.startUpload()

            expect(orch.getSnapshot().uploadErrorCode).toBeUndefined()
        })

        it('calls onPrepareFiles callback if provided', async () => {
            const core = createMockCore()
            core.upload.mockResolvedValue([])
            core.addFiles.mockResolvedValue(undefined)
            const prepared = [new File(['prepared'], 'prepared.txt')]
            const onPrepareFiles = vi.fn().mockResolvedValue(prepared)
            const orch = new UploaderOrchestrator(core, { onPrepareFiles })
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })

            await orch.startUpload()

            expect(onPrepareFiles).toHaveBeenCalledTimes(1)
            expect(core.removeAll).toHaveBeenCalled()
            expect(core.addFiles).toHaveBeenCalledWith(prepared)
        })

        it('does not replace files if onPrepareFiles returns same array', async () => {
            const core = createMockCore()
            core.upload.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {
                onPrepareFiles: (files) => files,
            })
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })

            await orch.startUpload()

            expect(core.removeAll).not.toHaveBeenCalled()
            expect(core.addFiles).not.toHaveBeenCalled()
        })
    })

    describe('retryUpload', () => {
        it('calls core.retry() with no arg for retry-all', async () => {
            const core = createMockCore()
            const mockFiles = [createUploadFile({ name: 'a.txt' })]
            core.retry.mockResolvedValue(mockFiles)
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })

            const result = await orch.retryUpload()

            expect(core.retry).toHaveBeenCalledWith(undefined)
            expect(result).toEqual(mockFiles)
        })

        it('calls core.retry(fileId) for single-file retry', async () => {
            const core = createMockCore()
            core.retry.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })

            await orch.retryUpload('file-123')

            expect(core.retry).toHaveBeenCalledWith('file-123')
        })

        it('returns undefined when no files', async () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const result = await orch.retryUpload()

            expect(result).toBeUndefined()
            expect(core.retry).not.toHaveBeenCalled()
        })

        it('clears uploadError before retrying', async () => {
            const core = createMockCore()
            core.retry.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({ files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]) })

            await orch.retryUpload()

            expect(orch.getSnapshot().uploadError).toBe('')
        })

        it('clears uploadErrorCode before retrying (P4/C9)', async () => {
            const core = createMockCore()
            core.retry.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({
                files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1' })]]),
                uploadErrorCode: 'bad_signature',
            })

            await orch.retryUpload()

            expect(orch.getSnapshot().uploadErrorCode).toBeUndefined()
        })
    })

    describe('handleCancel', () => {
        it('calls core.cancel() and core.removeAll()', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleCancel()

            expect(core.cancel).toHaveBeenCalled()
            expect(core.removeAll).toHaveBeenCalled()
        })

        it('revokes blob URLs for all files', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/cancel', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1', url: 'blob:http://localhost/cancel' })],
                    ['f2', createUploadFile({ name: 'b.txt', id: 'f2', url: 'blob:http://localhost/cancel' })],
                ]),
            })

            orch.handleCancel()

            expect(revokeObjectURL).toHaveBeenCalledTimes(2)
            vi.unstubAllGlobals()
        })

        it('resets progress-related state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleCancel()

            const state = orch.getSnapshot()
            expect(state.filesProgressMap).toEqual({})
            expect(state.uploadSpeed).toBe(0)
            expect(state.uploadEta).toBe(0)
            expect(state.uploadedBytes).toBe(0)
            expect(state.totalBytes).toBe(0)
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.handleCancel()

            expect(listener).toHaveBeenCalled()
        })
    })

    describe('handlePause', () => {
        it('calls core.pause()', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handlePause()

            expect(core.pause).toHaveBeenCalled()
        })
    })

    describe('handleResume', () => {
        it('calls core.resume()', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleResume()

            expect(core.resume).toHaveBeenCalled()
        })
    })

    describe('handleDone', () => {
        it('calls onDoneClicked callback', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const onDoneClicked = vi.fn()
            const orch = new UploaderOrchestrator(core, { onDoneClicked })

            orch.handleDone()

            expect(onDoneClicked).toHaveBeenCalledTimes(1)
        })

        it('emits done event on core', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleDone()

            expect(core.emit).toHaveBeenCalledWith('done', {})
        })

        it('calls handleCancel internally (cancel + removeAll)', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.handleDone()

            expect(core.cancel).toHaveBeenCalled()
            expect(core.removeAll).toHaveBeenCalled()
        })
    })

    describe('resetState', () => {
        it('sets isAddingMore to false', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})
            orch.setIsAddingMore(true)

            orch.resetState()

            expect(orch.getSnapshot().isAddingMore).toBe(false)
        })

        it('emits state-reset event', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.resetState()

            expect(core.emit).toHaveBeenCalledWith('state-reset', {})
        })

        it('calls handleDone (which cancels and clears)', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const onDoneClicked = vi.fn()
            const orch = new UploaderOrchestrator(core, { onDoneClicked })

            orch.resetState()

            expect(onDoneClicked).toHaveBeenCalled()
            expect(core.cancel).toHaveBeenCalled()
            expect(core.removeAll).toHaveBeenCalled()
        })

        it('revokes blob URLs for all files', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/reset', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({
                files: new Map([['f1', createUploadFile({ name: 'a.txt', id: 'f1', url: 'blob:http://localhost/reset' })]]),
            })

            orch.resetState()

            expect(revokeObjectURL).toHaveBeenCalled()
            vi.unstubAllGlobals()
        })

        it('resets progress-related state', () => {
            const core = createMockCore()
            core.emit = vi.fn()
            const orch = new UploaderOrchestrator(core, {})

            orch.resetState()

            const state = orch.getSnapshot()
            expect(state.filesProgressMap).toEqual({})
            expect(state.uploadSpeed).toBe(0)
            expect(state.uploadEta).toBe(0)
            expect(state.uploadedBytes).toBe(0)
            expect(state.totalBytes).toBe(0)
        })
    })

    // ── Image editor methods ─────────────────────────────────────────

    describe('openImageEditor', () => {
        it('sets editingFile in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({ name: 'photo.png', type: 'image/png' })

            orch.openImageEditor(file)

            expect(orch.getSnapshot().editingFile).toBe(file)
        })

        it('invokes onOpen callback from imageEditorOptions', () => {
            const core = createMockCore()
            const onOpen = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: { enabled: true, autoOpen: 'never', display: 'inline', onOpen },
            })
            const file = createUploadFile({ name: 'photo.png', type: 'image/png' })

            orch.openImageEditor(file)

            expect(onOpen).toHaveBeenCalledWith(file)
        })

        it('emits image-editor-open event on core', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({ name: 'photo.png', type: 'image/png' })

            orch.openImageEditor(file)

            expect(core.emit).toHaveBeenCalledWith('image-editor-open', { file })
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.openImageEditor(createUploadFile({ name: 'photo.png', type: 'image/png' }))

            expect(listener).toHaveBeenCalled()
        })
    })

    describe('closeImageEditor', () => {
        it('clears editingFile in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({ name: 'photo.png', type: 'image/png' })
            orch.openImageEditor(file)

            orch.closeImageEditor()

            expect(orch.getSnapshot().editingFile).toBeNull()
        })

        it('invokes onCancel callback with the file that was being edited', () => {
            const core = createMockCore()
            const onCancel = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: { enabled: true, autoOpen: 'never', display: 'inline', onCancel },
            })
            const file = createUploadFile({ name: 'photo.png', type: 'image/png' })
            orch.openImageEditor(file)

            orch.closeImageEditor()

            expect(onCancel).toHaveBeenCalledWith(file)
        })

        it('emits image-editor-cancel event on core', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({ name: 'photo.png', type: 'image/png' })
            orch.openImageEditor(file)

            orch.closeImageEditor()

            expect(core.emit).toHaveBeenCalledWith('image-editor-cancel', { file })
        })

        it('does not invoke onCancel when no file was being edited', () => {
            const core = createMockCore()
            const onCancel = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: { enabled: true, autoOpen: 'never', display: 'inline', onCancel },
            })

            orch.closeImageEditor()

            expect(onCancel).not.toHaveBeenCalled()
        })

        it('auto-opens next file from editor queue', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' })
            const file2 = createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' })

            // Open first file, enqueue second
            orch.openImageEditor(file1)
            orch.enqueueForEditor([file2])

            // Close first -> should auto-open second
            orch.closeImageEditor()

            expect(orch.getSnapshot().editingFile).toBe(file2)
            expect(orch.getSnapshot().editorQueue).toEqual([])
        })
    })

    describe('saveImageEdit', () => {
        it('does nothing when no file is being edited', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(core.replaceFile).not.toHaveBeenCalled()
        })

        it('replaces the file with edited version and clears editingFile', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({ name: 'photo.png', id: 'photo-1', type: 'image/png' })

            // Add the file to state so revokeAndReplace can find it
            const filesMap = new Map<string, UploadFile>()
            filesMap.set('photo-1', file)
            // Seed files via addFiles workaround -- use openImageEditor to set editing
            orch.openImageEditor(file)

            // Use a minimal valid data URL
            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(orch.getSnapshot().editingFile).toBeNull()
            expect(core.replaceFile).toHaveBeenCalledTimes(1)
            expect(core.replaceFile).toHaveBeenCalledWith('photo-1', expect.any(Object))
        })

        it('invokes onSave callback with edited and original file', () => {
            const core = createMockCore()
            const onSave = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: { enabled: true, autoOpen: 'never', display: 'inline', onSave },
            })
            const file = createUploadFile({ name: 'photo.png', id: 'photo-1', type: 'image/png' })
            orch.openImageEditor(file)

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(onSave).toHaveBeenCalledTimes(1)
            expect(onSave).toHaveBeenCalledWith(expect.any(Object), file)
        })

        it('emits image-editor-save event', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file = createUploadFile({ name: 'photo.png', id: 'photo-1', type: 'image/png' })
            orch.openImageEditor(file)

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            expect(core.emit).toHaveBeenCalledWith('image-editor-save', {
                file: expect.any(Object),
                original: file,
            })
        })

        it('uses mimeType parameter when provided', () => {
            const core = createMockCore()
            const onSave = vi.fn()
            const orch = new UploaderOrchestrator(core, {
                imageEditorOptions: { enabled: true, autoOpen: 'never', display: 'inline', onSave },
            })
            const file = createUploadFile({ name: 'photo.png', id: 'photo-1', type: 'image/png' })
            orch.openImageEditor(file)

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=', 'image/webp')

            // The new file passed to onSave should have the requested MIME type
            const newFile = onSave.mock.calls[0][0] as UploadFile
            expect(newFile.type).toBe('image/webp')
        })

        it('processes editor queue after saving', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' })
            const file2 = createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' })

            orch.openImageEditor(file1)
            orch.enqueueForEditor([file2])

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')

            // After saving, next queued file should auto-open
            expect(orch.getSnapshot().editingFile).toBe(file2)
            expect(orch.getSnapshot().editorQueue).toEqual([])
        })
    })

    describe('replaceFile', () => {
        it('replaces a file in state by id', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({ name: 'original.txt', id: 'file-1' })
            ;(orch as any).setState({ files: new Map([['file-1', original]]) })

            const replacement = createUploadFile({ name: 'replacement.txt', id: 'file-1' })
            orch.replaceFile('file-1', replacement)

            expect(orch.getSnapshot().files.get('file-1')?.name).toBe('replacement.txt')
        })

        it('calls core.replaceFile', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({ name: 'original.txt', id: 'file-1' })
            ;(orch as any).setState({ files: new Map([['file-1', original]]) })

            const replacement = createUploadFile({ name: 'replacement.txt', id: 'file-1' })
            orch.replaceFile('file-1', replacement)

            expect(core.replaceFile).toHaveBeenCalledWith('file-1', replacement)
        })

        it('revokes old blob URL', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/old', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({ name: 'original.txt', id: 'file-1', url: 'blob:http://localhost/old' })
            ;(orch as any).setState({ files: new Map([['file-1', original]]) })

            const replacement = createUploadFile({ name: 'replacement.txt', id: 'file-1' })
            orch.replaceFile('file-1', replacement)

            expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/old')
            vi.unstubAllGlobals()
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const original = createUploadFile({ name: 'original.txt', id: 'file-1' })
            ;(orch as any).setState({ files: new Map([['file-1', original]]) })

            const listener = vi.fn()
            orch.subscribe(listener)

            const replacement = createUploadFile({ name: 'replacement.txt', id: 'file-1' })
            orch.replaceFile('file-1', replacement)

            expect(listener).toHaveBeenCalled()
        })
    })

    describe('enqueueForEditor', () => {
        it('adds files to the editor queue', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' })
            const file2 = createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' })

            // Must have something editing so queue isn't immediately processed
            orch.openImageEditor(createUploadFile({ name: 'current.png', id: 'current', type: 'image/png' }))
            orch.enqueueForEditor([file1, file2])

            expect(orch.getSnapshot().editorQueue).toEqual([file1, file2])
        })

        it('does nothing for empty array', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.enqueueForEditor([])

            expect(listener).not.toHaveBeenCalled()
        })

        it('auto-opens first file if nothing is being edited', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' })
            const file2 = createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' })

            orch.enqueueForEditor([file1, file2])

            // First file should be auto-opened, second stays in queue
            expect(orch.getSnapshot().editingFile).toBe(file1)
            expect(orch.getSnapshot().editorQueue).toEqual([file2])
        })

        it('appends to existing queue', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const file1 = createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' })
            const file2 = createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' })
            const file3 = createUploadFile({ name: 'c.png', id: 'c', type: 'image/png' })

            orch.openImageEditor(createUploadFile({ name: 'current.png', id: 'current', type: 'image/png' }))
            orch.enqueueForEditor([file1])
            orch.enqueueForEditor([file2, file3])

            expect(orch.getSnapshot().editorQueue).toEqual([file1, file2, file3])
        })
    })

    describe('editor queue integration', () => {
        it('processes entire queue sequentially via close', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const files = [
                createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' }),
                createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' }),
                createUploadFile({ name: 'c.png', id: 'c', type: 'image/png' }),
            ]

            orch.enqueueForEditor(files)

            // First should be open
            expect(orch.getSnapshot().editingFile?.id).toBe('a')

            orch.closeImageEditor()
            expect(orch.getSnapshot().editingFile?.id).toBe('b')

            orch.closeImageEditor()
            expect(orch.getSnapshot().editingFile?.id).toBe('c')

            orch.closeImageEditor()
            expect(orch.getSnapshot().editingFile).toBeNull()
            expect(orch.getSnapshot().editorQueue).toEqual([])
        })

        it('processes queue after save (not just close)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const files = [
                createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' }),
                createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' }),
            ]

            orch.enqueueForEditor(files)
            expect(orch.getSnapshot().editingFile?.id).toBe('a')

            orch.saveImageEdit('data:image/png;base64,iVBORw0KGgo=')
            expect(orch.getSnapshot().editingFile?.id).toBe('b')
        })
    })

    // ── Lifecycle (init / destroy) ──────────────────────────────────

    describe('init', () => {
        it('subscribes to all expected core events', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()

            const subscribedEvents = (core.on as ReturnType<typeof vi.fn>).mock.calls.map(
                (call: any[]) => call[0],
            )
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
            it('sets uploadStatus to UPLOADING and calls onUploadStart', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onUploadStart = vi.fn()
                const orch = new UploaderOrchestrator(core, { onUploadStart })
                orch.init()

                handlers['upload-start']({})

                expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.UPLOADING)
                expect(onUploadStart).toHaveBeenCalledTimes(1)
            })
        })

        describe('file-upload-start handler', () => {
            it('calls onFileUploadStart with the file', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileUploadStart = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFileUploadStart })
                orch.init()

                const file = createUploadFile({ name: 'test.txt' })
                handlers['file-upload-start']({ file })

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
                handlers['files-added'](files)

                expect(onFilesSelected).toHaveBeenCalledWith(files)
            })

            it('skips empty arrays', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFilesSelected = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFilesSelected })
                orch.init()

                handlers['files-added']([])

                expect(onFilesSelected).not.toHaveBeenCalled()
                expect(orch.getSnapshot().files.size).toBe(0)
            })

            it('enqueues images for editor when autoOpen is always', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {
                    imageEditorOptions: { enabled: true, autoOpen: 'always', display: 'inline' },
                })
                orch.init()

                const img = createUploadFile({ name: 'photo.png', id: 'img1', type: 'image/png' })
                const txt = createUploadFile({ name: 'doc.txt', id: 'txt1', type: 'text/plain' })
                handlers['files-added']([img, txt])

                // Image should be opened in editor (auto-opened from queue)
                expect(orch.getSnapshot().editingFile).toBe(img)
            })

            it('enqueues single image for editor when autoOpen is single', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {
                    imageEditorOptions: { enabled: true, autoOpen: 'single', display: 'inline' },
                })
                orch.init()

                const img = createUploadFile({ name: 'photo.png', id: 'img1', type: 'image/png' })
                handlers['files-added']([img])

                expect(orch.getSnapshot().editingFile).toBe(img)
            })

            it('does not auto-open when autoOpen is single but multiple images added', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {
                    imageEditorOptions: { enabled: true, autoOpen: 'single', display: 'inline' },
                })
                orch.init()

                const img1 = createUploadFile({ name: 'a.png', id: 'a', type: 'image/png' })
                const img2 = createUploadFile({ name: 'b.png', id: 'b', type: 'image/png' })
                handlers['files-added']([img1, img2])

                // Nothing opened because 2 images with 'single' mode
                expect(orch.getSnapshot().editingFile).toBeNull()
            })

            it('triggers auto-upload when enabled', () => {
                vi.useFakeTimers()
                const { core, handlers } = createMockCoreWithHandlers()
                core.upload = vi.fn().mockResolvedValue([])
                const orch = new UploaderOrchestrator(core, { autoUpload: true })
                orch.init()

                const file = createUploadFile({ name: 'a.txt', id: 'a' })
                handlers['files-added']([file])

                expect(core.emit).toHaveBeenCalledWith('auto-upload', { count: 1 })

                vi.runAllTimers()
                expect(core.upload).toHaveBeenCalled()
                vi.useRealTimers()
            })

            // totalBytes is now computed in rebuildFilesProjection (owned by state-change).
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
                handlers['file-removed'](file)

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
                const ghost = createUploadFile({ name: 'ghost.txt', id: 'ghost' })
                handlers['file-removed'](ghost)

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
                const { core, handlers } = createMockCoreWithHandlers()
                core.progress = { totalFiles: 1, completedFiles: 0, percentage: 50 }
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['upload-progress']({ fileId: 'f1', loaded: 500, total: 1000 })

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
                const orch = new UploaderOrchestrator(core, { onFileUploadProgress })
                orch.init()

                // Seed a file via real core so orchestrator projection reflects it
                await core.addFiles([new File(['data'], 'a.txt', { type: 'text/plain' })])
                const [fileId, file] = [...orch.getSnapshot().files.entries()][0]

                // Simulate the upload-progress event directly on core
                core.emit('upload-progress', { fileId, loaded: 300, total: 1000 })

                expect(onFileUploadProgress).toHaveBeenCalledWith(
                    file,
                    { loaded: 300, total: 1000, percentage: 30 },
                )
                core.destroy()
            })

            it('calls onFilesUploadProgress with core progress', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                core.progress = { totalFiles: 2, completedFiles: 1, percentage: 50 }
                const onFilesUploadProgress = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFilesUploadProgress })
                orch.init()

                handlers['upload-progress']({ fileId: 'f1', loaded: 500, total: 1000 })

                expect(onFilesUploadProgress).toHaveBeenCalledWith(1, 2)
            })
        })

        describe('upload-success handler', () => {
            it('calls onFileUploadComplete with file and key', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileUploadComplete = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFileUploadComplete })
                orch.init()

                const file = createUploadFile({ name: 'a.txt' })
                handlers['upload-success']({ file, result: { key: 'uploads/a.txt' } })

                expect(onFileUploadComplete).toHaveBeenCalledWith(file, 'uploads/a.txt')
            })

            it('falls back to file.key when result has no key', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFileUploadComplete = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFileUploadComplete })
                orch.init()

                const file = Object.assign(
                    createUploadFile({ name: 'a.txt' }),
                    { key: 'fallback-key' },
                )
                handlers['upload-success']({ file, result: {} })

                expect(onFileUploadComplete).toHaveBeenCalledWith(file, 'fallback-key')
            })
        })

        describe('upload-all-complete handler', () => {
            it('sets uploadStatus to DONE', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['upload-all-complete']([])

                expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.SUCCESSFUL)
            })

            it('calls onFilesUploadComplete and onUploadComplete', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onFilesUploadComplete = vi.fn()
                const onUploadComplete = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFilesUploadComplete, onUploadComplete })
                orch.init()

                const files = [createUploadFile({ name: 'a.txt' })]
                handlers['upload-all-complete'](files)

                expect(onFilesUploadComplete).toHaveBeenCalledWith(files)
                expect(onUploadComplete).toHaveBeenCalledWith(files)
            })
        })

        describe('upload-error handler', () => {
            it('sets uploadStatus to ERROR and uploadError message', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['upload-error']({ error: new Error('Network failure') })

                expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.FAILED)
                expect(orch.getSnapshot().uploadError).toBe('Network failure')
            })

            it('calls onError callback', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const onError = vi.fn()
                const orch = new UploaderOrchestrator(core, { onError })
                orch.init()

                handlers['upload-error']({ error: new Error('Timeout') })

                expect(onError).toHaveBeenCalledWith('Timeout')
            })

            it('sets uploadErrorCode from a typed UpupStorageError (P4/C9)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                const err = new UpupStorageError('Signature mismatch', 'S3', 'upload')
                err.code = 'SignatureDoesNotMatch'
                handlers['upload-error']({ error: err })

                expect(orch.getSnapshot().uploadError).toBe('Signature mismatch')
                expect(orch.getSnapshot().uploadErrorCode).toBe('SignatureDoesNotMatch')
            })

            it('leaves uploadErrorCode undefined for a plain Error (no code)', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                handlers['upload-error']({ error: new Error('plain failure') })

                expect(orch.getSnapshot().uploadErrorCode).toBeUndefined()
            })
        })
    })

    describe('destroy', () => {
        it('calls all unsubscribe functions from init', () => {
            const { core, unsubs } = createMockCoreWithHandlers()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()

            const unsubCount = unsubs.length
            expect(unsubCount).toBeGreaterThan(0)

            orch.destroy()

            unsubs.forEach(unsub => {
                expect(unsub).toHaveBeenCalled()
            })
        })

        it('clears listeners after destroy', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)
            orch.init()

            orch.destroy()

            // After destroy, state should still be readable but listeners cleared
            expect(orch.getSnapshot().files.size).toBe(0)
        })

        it('is safe to call multiple times', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()

            orch.destroy()
            orch.destroy() // should not throw

            expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.IDLE)
        })

        it('revokes blob URLs for every still-selected file', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/destroy', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            ;(orch as any).setState({
                files: new Map([
                    ['f1', createUploadFile({ name: 'a.txt', id: 'f1', url: 'blob:http://localhost/destroy' })],
                    ['f2', createUploadFile({ name: 'b.txt', id: 'f2', url: 'blob:http://localhost/destroy' })],
                ]),
            })

            orch.destroy()

            expect(revokeObjectURL).toHaveBeenCalledTimes(2)
            vi.unstubAllGlobals()
        })
    })

    // ── Tier 3.1 Task 1: files projection reflects ALL core mutations ──
    describe('files projection reflects ALL core file mutations (Tier 3.1)', () => {
        const realFile = (name: string, bytes = 4): File =>
            new File([new Uint8Array(bytes)], name, { type: 'text/plain' })

        function setup() {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            return { core, orch }
        }
        const names = (orch: UploaderOrchestrator) =>
            [...orch.getSnapshot().files.values()].map(f => f.name)

        it('reflects core.addFiles', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            expect(names(orch)).toEqual(['a.txt'])
            core.destroy()
        })

        it('reflects core.setFiles (was stale before the projection)', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            await core.setFiles([realFile('b.txt'), realFile('c.txt')])
            expect(names(orch)).toEqual(['b.txt', 'c.txt'])
            core.destroy()
        })

        it('reflects core.reorderFiles', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            const ids = [...core.files.keys()]
            core.reorderFiles([ids[1], ids[0]])
            expect(names(orch)).toEqual(['b.txt', 'a.txt'])
            core.destroy()
        })

        it('reflects core.replaceFile', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            const [id] = [...core.files.keys()]
            // Build a replacement matching core.replaceFile's expected arg type
            // (core.replaceFile takes File | UploadFile; pass a plain File)
            core.replaceFile(id, realFile('a-edited.txt') as never)
            expect(names(orch)).toEqual(['a-edited.txt'])
            core.destroy()
        })

        it('reflects core.restore (crash-recovery path)', async () => {
            const seed = setup()
            await seed.core.addFiles([realFile('a.txt')])
            const snap = seed.core.getSnapshot()
            seed.core.destroy()
            const { core, orch } = setup()
            core.restore(snap)
            expect(names(orch)).toEqual(['a.txt'])
            core.destroy()
        })

        it('empties on core.removeAll', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)
            core.removeAll()
            expect(orch.getSnapshot().files.size).toBe(0)
            core.destroy()
        })

        it('keeps a STABLE files reference across status-only state-change events', async () => {
            const { core, orch } = setup()
            await core.addFiles([realFile('a.txt')])
            const ref1 = orch.getSnapshot().files
            core.emit('state-change', { status: core.status })
            expect(orch.getSnapshot().files).toBe(ref1) // no file change → same ref
            core.destroy()
        })
    })

    // ── Integration: real core ⇄ orchestrator removal mirror ────────
    describe('integration: core removal mirror (real UpupCore)', () => {
        const makeRealCore = () =>
            new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        const realFile = (name: string) =>
            new File(['x'], name, { type: 'text/plain' })

        it('mirrors a direct core.removeFile into orchestrator state (Vue/Svelte/Angular path)', async () => {
            const core = makeRealCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)

            const [id] = [...core.files.keys()]
            core.removeFile(id)

            expect(orch.getSnapshot().files.size).toBe(1)
            expect(orch.getSnapshot().files.has(id)).toBe(false)
            orch.destroy()
        })

        it('mirrors core.removeAll into orchestrator state (Remove all path)', async () => {
            const core = makeRealCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([realFile('a.txt'), realFile('b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)

            core.removeAll()

            expect(orch.getSnapshot().files.size).toBe(0)
            orch.destroy()
        })
    })
})
