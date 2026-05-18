import { UploadStatus } from '../types/upload-status'
import type { UpupCore } from '../core'
import type { OrchestratorState, OrchestratorCallbacks } from './types'

export class UploaderOrchestrator {
    private state: OrchestratorState
    private listeners = new Set<() => void>()
    private core: UpupCore
    private callbacks: OrchestratorCallbacks
    private unsubs: (() => void)[] = []

    constructor(core: UpupCore, callbacks: OrchestratorCallbacks) {
        this.core = core
        this.callbacks = callbacks
        this.state = {
            files: new Map(),
            uploadStatus: UploadStatus.IDLE,
            uploadError: '',
            totalProgress: 0,
            filesProgressMap: {},
            uploadSpeed: 0,
            uploadEta: 0,
            uploadedBytes: 0,
            totalBytes: 0,
            activeAdapter: undefined,
            editingFile: null,
            editorQueue: [],
            isAddingMore: false,
            viewMode: 'grid',
            isOnline: true,
        }
    }

    /** useSyncExternalStore-compatible subscribe (bound). */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    /** useSyncExternalStore-compatible getSnapshot (bound). */
    getSnapshot = (): OrchestratorState => {
        return this.state
    }

    protected setState(partial: Partial<OrchestratorState>): void {
        this.state = { ...this.state, ...partial }
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach(fn => fn())
    }

    init(): void {
        // Will be filled in subsequent tasks
    }

    destroy(): void {
        this.unsubs.forEach(u => u())
        this.unsubs = []
        this.listeners.clear()
    }
}
