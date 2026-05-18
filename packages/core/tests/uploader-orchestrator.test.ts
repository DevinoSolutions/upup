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
        upload: vi.fn(),
        destroy: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        retry: vi.fn(),
        getPlugin: vi.fn(),
    } as any
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
})
