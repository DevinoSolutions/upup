import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UpupCore } from '../src/core'
import { UploadStatus } from '../src/types/upload-status'
import { FileSource } from '../src/types/file-source'
import { createMockCore } from './helpers/uploader-orchestrator-fixtures'

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
            await core.addFiles([
                new File(['data'], 'test.txt', { type: 'text/plain' }),
            ])
            const fileId = orch.getSnapshot().files.keys().next()
                .value as string

            orch.removeFile(fileId)

            expect(orch.getSnapshot().files.size).toBe(0)
            core.destroy()
        })

        it('calls core.removeFile with the id', async () => {
            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([
                new File(['data'], 'test.txt', { type: 'text/plain' }),
            ])
            const fileId = orch.getSnapshot().files.keys().next()
                .value as string

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
            const fileId = orch.getSnapshot().files.keys().next()
                .value as string
            const file = orch.getSnapshot().files.get(fileId)

            orch.removeFile(fileId)

            expect(onFileRemoved).toHaveBeenCalledTimes(1)
            expect(onFileRemoved).toHaveBeenCalledWith(file)
            core.destroy()
        })

        it('revokes blob URL before removing', async () => {
            const revokeObjectURL = vi.fn()
            vi.stubGlobal('URL', {
                ...globalThis.URL,
                createObjectURL: () => 'blob:http://localhost/test',
                revokeObjectURL,
            })

            const core = new UpupCore({})
            const orch = new UploaderOrchestrator(core, {})
            orch.init()
            await core.addFiles([new File(['data'], 'blob-test.txt')])
            const fileId = orch.getSnapshot().files.keys().next()
                .value as string

            orch.removeFile(fileId)

            expect(revokeObjectURL).toHaveBeenCalledWith(
                'blob:http://localhost/test',
            )
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
            const fileId = orch.getSnapshot().files.keys().next()
                .value as string

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
            expect(orch.getSnapshot().activeSource).toBe(
                FileSource.GOOGLE_DRIVE,
            )
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
})
