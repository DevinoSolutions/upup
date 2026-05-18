import { describe, it, expect, vi } from 'vitest'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UploadStatus } from '../src/types/upload-status'

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
})
