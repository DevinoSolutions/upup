import { UploadStatus } from '../types/upload-status'
import type { FileSource } from '../types/file-source'
import type { UploadFile } from '../types/upload-file'
import type { UpupCore } from '../core'
import type { OrchestratorState, OrchestratorCallbacks } from './types'
import { fileAppendParams, revokeFileUrl } from '../utils/file-helpers'

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

    // ── File management methods ──────────────────────────────────────

    /** Remove a file by id: revoke blob URL, remove from state, notify core. */
    removeFile(fileId: string): void {
        const file = this.state.files.get(fileId)
        if (file) revokeFileUrl(file)
        const next = new Map(this.state.files)
        next.delete(fileId)
        this.setState({ files: next })
        this.core.removeFile(fileId)
        if (file) this.callbacks.onFileRemoved?.(file)
    }

    /** Set the active cloud/source adapter. */
    setActiveAdapter(adapter: FileSource | undefined): void {
        this.setState({ activeAdapter: adapter })
    }

    /** Toggle between grid and list view. */
    setViewMode(mode: 'grid' | 'list'): void {
        this.setState({ viewMode: mode })
    }

    /** Toggle the "adding more files" state. */
    setIsAddingMore(value: boolean): void {
        this.setState({ isAddingMore: value })
    }

    /** Add raw File objects to state (converts via fileAppendParams). */
    addFiles(files: File[]): void {
        const next = new Map(this.state.files)
        for (const file of files) {
            const uploadFile = fileAppendParams(file)
            next.set(uploadFile.id, uploadFile)
        }
        this.setState({ files: next })
    }

    /** Replace all files in state with new ones (revokes old blob URLs). */
    dynamicallyReplaceFiles(files: File[]): void {
        this.state.files.forEach(file => revokeFileUrl(file))
        const next = new Map<string, UploadFile>()
        for (const file of files) {
            const uploadFile = fileAppendParams(file)
            next.set(uploadFile.id, uploadFile)
        }
        this.setState({ files: next })
    }

    // ── Lifecycle ────────────────────────────────────────────────────

    init(): void {
        // Will be filled in subsequent tasks
    }

    destroy(): void {
        this.unsubs.forEach(u => u())
        this.unsubs = []
        this.listeners.clear()
    }
}
