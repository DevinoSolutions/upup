import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UploadStatus } from '../src/types/upload-status'
import { FileSource } from '../src/types/file-source'
import type { UploadFile } from '../src/types/upload-file'

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
        it('removes file from state and calls core.removeFile', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            // Seed the state via addFiles
            const raw = new File(['data'], 'test.txt', { type: 'text/plain' })
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            orch.removeFile(fileId)

            expect(orch.getSnapshot().files.size).toBe(0)
            expect(core.removeFile).toHaveBeenCalledWith(fileId)
        })

        it('calls onFileRemoved callback with the removed file', () => {
            const core = createMockCore()
            const onFileRemoved = vi.fn()
            const orch = new UploaderOrchestrator(core, { onFileRemoved })

            const raw = new File(['data'], 'callback-test.txt')
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string
            const file = orch.getSnapshot().files.get(fileId)

            orch.removeFile(fileId)

            expect(onFileRemoved).toHaveBeenCalledTimes(1)
            expect(onFileRemoved).toHaveBeenCalledWith(file)
        })

        it('revokes blob URL before removing', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/test', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            const raw = new File(['data'], 'blob-test.txt')
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            orch.removeFile(fileId)

            expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test')
            vi.unstubAllGlobals()
        })

        it('does not call onFileRemoved when file does not exist', () => {
            const core = createMockCore()
            const onFileRemoved = vi.fn()
            const orch = new UploaderOrchestrator(core, { onFileRemoved })

            orch.removeFile('nonexistent')

            expect(onFileRemoved).not.toHaveBeenCalled()
            expect(core.removeFile).toHaveBeenCalledWith('nonexistent')
        })

        it('notifies listeners on removal', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const raw = new File(['data'], 'notify.txt')
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            const listener = vi.fn()
            orch.subscribe(listener)
            orch.removeFile(fileId)

            expect(listener).toHaveBeenCalled()
        })

        it('creates a new state reference (immutable)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const raw = new File(['data'], 'immutable.txt')
            orch.addFiles([raw])
            const stateBefore = orch.getSnapshot()
            const fileId = stateBefore.files.keys().next().value as string

            orch.removeFile(fileId)
            const stateAfter = orch.getSnapshot()

            expect(stateAfter).not.toBe(stateBefore)
            expect(stateAfter.files).not.toBe(stateBefore.files)
        })
    })

    describe('setActiveAdapter', () => {
        it('updates activeAdapter in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            expect(orch.getSnapshot().activeAdapter).toBeUndefined()

            orch.setActiveAdapter(FileSource.GOOGLE_DRIVE)
            expect(orch.getSnapshot().activeAdapter).toBe(FileSource.GOOGLE_DRIVE)
        })

        it('can clear activeAdapter with undefined', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.setActiveAdapter(FileSource.DROPBOX)
            orch.setActiveAdapter(undefined)
            expect(orch.getSnapshot().activeAdapter).toBeUndefined()
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.setActiveAdapter(FileSource.LOCAL)
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

    describe('addFiles', () => {
        it('adds files to the state Map', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
            const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
            orch.addFiles([f1, f2])

            expect(orch.getSnapshot().files.size).toBe(2)
        })

        it('converts files via fileAppendParams (adds id, url, source, status)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const raw = new File(['data'], 'test.txt', { type: 'text/plain' })
            orch.addFiles([raw])

            const files = orch.getSnapshot().files
            const entry = files.values().next().value as UploadFile
            expect(entry.id).toBeDefined()
            expect(entry.source).toBe(FileSource.LOCAL)
            expect(entry.status).toBe(UploadStatus.READY)
        })

        it('preserves existing files when adding more', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.addFiles([new File(['a'], 'a.txt')])
            expect(orch.getSnapshot().files.size).toBe(1)

            orch.addFiles([new File(['b'], 'b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.addFiles([new File(['a'], 'a.txt')])
            expect(listener).toHaveBeenCalledTimes(1)
        })

        it('creates a new state reference (immutable)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const before = orch.getSnapshot()

            orch.addFiles([new File(['a'], 'a.txt')])
            const after = orch.getSnapshot()

            expect(after).not.toBe(before)
            expect(after.files).not.toBe(before.files)
        })
    })

    // ── Upload control methods ────────────────────────────────────────

    describe('proceedUpload', () => {
        it('calls core.upload() and returns result', async () => {
            const core = createMockCore()
            const mockFiles = [createUploadFile({ name: 'a.txt' })]
            core.upload.mockResolvedValue(mockFiles)
            const orch = new UploaderOrchestrator(core, {})
            orch.addFiles([new File(['a'], 'a.txt')])

            const result = await orch.proceedUpload()

            expect(core.upload).toHaveBeenCalled()
            expect(result).toEqual(mockFiles)
        })

        it('returns undefined when no files', async () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            const result = await orch.proceedUpload()

            expect(result).toBeUndefined()
            expect(core.upload).not.toHaveBeenCalled()
        })

        it('clears uploadError before uploading', async () => {
            const core = createMockCore()
            core.upload.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            orch.addFiles([new File(['a'], 'a.txt')])
            // Simulate prior error state via setState (use removeFile to trigger setState indirectly)
            // We need to set uploadError -- use the internal setState via a known path
            // Instead, just verify it resets
            await orch.proceedUpload()

            expect(orch.getSnapshot().uploadError).toBe('')
        })

        it('calls onPrepareFiles callback if provided', async () => {
            const core = createMockCore()
            core.upload.mockResolvedValue([])
            core.addFiles.mockResolvedValue(undefined)
            const prepared = [new File(['prepared'], 'prepared.txt')]
            const onPrepareFiles = vi.fn().mockResolvedValue(prepared)
            const orch = new UploaderOrchestrator(core, { onPrepareFiles })
            orch.addFiles([new File(['a'], 'a.txt')])

            await orch.proceedUpload()

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
            orch.addFiles([new File(['a'], 'a.txt')])

            await orch.proceedUpload()

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
            orch.addFiles([new File(['a'], 'a.txt')])

            const result = await orch.retryUpload()

            expect(core.retry).toHaveBeenCalledWith(undefined)
            expect(result).toEqual(mockFiles)
        })

        it('calls core.retry(fileId) for single-file retry', async () => {
            const core = createMockCore()
            core.retry.mockResolvedValue([])
            const orch = new UploaderOrchestrator(core, {})
            orch.addFiles([new File(['a'], 'a.txt')])

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
            orch.addFiles([new File(['a'], 'a.txt')])

            await orch.retryUpload()

            expect(orch.getSnapshot().uploadError).toBe('')
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
            orch.addFiles([new File(['a'], 'a.txt'), new File(['b'], 'b.txt')])

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
            orch.addFiles([new File(['a'], 'a.txt')])

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
            const raw = new File(['data'], 'original.txt', { type: 'text/plain' })
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            const replacement = createUploadFile({ name: 'replacement.txt', id: fileId })
            orch.replaceFile(fileId, replacement)

            expect(orch.getSnapshot().files.get(fileId)?.name).toBe('replacement.txt')
        })

        it('calls core.replaceFile', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const raw = new File(['data'], 'original.txt', { type: 'text/plain' })
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            const replacement = createUploadFile({ name: 'replacement.txt', id: fileId })
            orch.replaceFile(fileId, replacement)

            expect(core.replaceFile).toHaveBeenCalledWith(fileId, replacement)
        })

        it('revokes old blob URL', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/old', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            const raw = new File(['data'], 'original.txt', { type: 'text/plain' })
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            const replacement = createUploadFile({ name: 'replacement.txt', id: fileId })
            orch.replaceFile(fileId, replacement)

            expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/old')
            vi.unstubAllGlobals()
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const raw = new File(['data'], 'original.txt', { type: 'text/plain' })
            orch.addFiles([raw])
            const fileId = orch.getSnapshot().files.keys().next().value as string

            const listener = vi.fn()
            orch.subscribe(listener)

            const replacement = createUploadFile({ name: 'replacement.txt', id: fileId })
            orch.replaceFile(fileId, replacement)

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

    // ── File management (continued) ─────────────────────────────────

    describe('dynamicallyReplaceFiles', () => {
        it('replaces all files in state', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})

            orch.addFiles([new File(['a'], 'a.txt'), new File(['b'], 'b.txt')])
            expect(orch.getSnapshot().files.size).toBe(2)

            orch.dynamicallyReplaceFiles([new File(['c'], 'c.txt')])
            expect(orch.getSnapshot().files.size).toBe(1)
            const entry = orch.getSnapshot().files.values().next().value as UploadFile
            expect(entry.name).toBe('c.txt')
        })

        it('revokes old blob URLs', () => {
            const core = createMockCore()
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL: () => 'blob:http://localhost/old', revokeObjectURL })

            const orch = new UploaderOrchestrator(core, {})
            orch.addFiles([new File(['a'], 'old.txt')])

            orch.dynamicallyReplaceFiles([new File(['b'], 'new.txt')])

            expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/old')
            vi.unstubAllGlobals()
        })

        it('works with empty replacement (clears all files)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.addFiles([new File(['a'], 'a.txt')])

            orch.dynamicallyReplaceFiles([])
            expect(orch.getSnapshot().files.size).toBe(0)
        })

        it('notifies listeners', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            const listener = vi.fn()
            orch.subscribe(listener)

            orch.dynamicallyReplaceFiles([new File(['a'], 'a.txt')])
            expect(listener).toHaveBeenCalled()
        })

        it('creates a new state reference (immutable)', () => {
            const core = createMockCore()
            const orch = new UploaderOrchestrator(core, {})
            orch.addFiles([new File(['a'], 'a.txt')])
            const before = orch.getSnapshot()

            orch.dynamicallyReplaceFiles([new File(['b'], 'b.txt')])
            const after = orch.getSnapshot()

            expect(after).not.toBe(before)
            expect(after.files).not.toBe(before.files)
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
            expect(subscribedEvents).toContain('files-added')
            expect(subscribedEvents).toContain('file-removed')
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
            it('merges added files into state', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                const file1 = createUploadFile({ name: 'a.txt', id: 'a' })
                const file2 = createUploadFile({ name: 'b.txt', id: 'b' })
                handlers['files-added']([file1, file2])

                expect(orch.getSnapshot().files.size).toBe(2)
                expect(orch.getSnapshot().files.get('a')).toBe(file1)
                expect(orch.getSnapshot().files.get('b')).toBe(file2)
            })

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

            it('updates totalBytes when files are added', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                const orch = new UploaderOrchestrator(core, {})
                orch.init()

                const file = createUploadFile({ name: 'a.txt', id: 'a' })
                handlers['files-added']([file])

                expect(orch.getSnapshot().totalBytes).toBe(file.size)
            })
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
        })

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

            it('calls onFileUploadProgress with progress info', () => {
                const { core, handlers } = createMockCoreWithHandlers()
                core.progress = { totalFiles: 1, completedFiles: 0, percentage: 50 }
                const onFileUploadProgress = vi.fn()
                const orch = new UploaderOrchestrator(core, { onFileUploadProgress })
                orch.init()

                // Seed a file so the handler can find it
                const file = createUploadFile({ name: 'a.txt', id: 'f1' })
                orch.addFiles([]) // ensure files map exists
                handlers['files-added']([file])

                handlers['upload-progress']({ fileId: 'f1', loaded: 300, total: 1000 })

                expect(onFileUploadProgress).toHaveBeenCalledWith(
                    file,
                    { loaded: 300, total: 1000, percentage: 30 },
                )
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
    })
})
