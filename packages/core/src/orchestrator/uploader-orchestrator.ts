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

    // ── Upload control methods ──────────────────────────────────────

    /** Trigger upload for all current files. Calls onPrepareFiles if provided. */
    async proceedUpload(): Promise<UploadFile[] | undefined> {
        const currentFiles = [...this.state.files.values()]
        if (currentFiles.length === 0) return undefined
        this.setState({ uploadError: '' })

        const prepared = this.callbacks.onPrepareFiles
            ? await this.callbacks.onPrepareFiles(currentFiles)
            : currentFiles

        // If onPrepareFiles returned different files, replace them in core
        if (prepared !== currentFiles) {
            this.core.removeAll()
            await this.core.addFiles(prepared as File[])
        }

        return await this.core.upload()
    }

    /** Retry upload for a specific file or all failed files. */
    async retryUpload(fileId?: string): Promise<UploadFile[] | undefined> {
        if (this.state.files.size === 0) return undefined
        this.setState({ uploadError: '' })
        return await this.core.retry(fileId)
    }

    /** Cancel in-progress upload, revoke blob URLs, clear all files and progress. */
    handleCancel(): void {
        this.core.cancel()
        this.state.files.forEach(file => revokeFileUrl(file))
        this.core.removeAll()
        this.setState({
            filesProgressMap: {},
            uploadSpeed: 0,
            uploadEta: 0,
            uploadedBytes: 0,
            totalBytes: 0,
        })
    }

    /** Pause in-progress upload. */
    handlePause(): void {
        this.core.pause()
    }

    /** Resume paused upload. */
    handleResume(): void {
        this.core.resume()
    }

    /** Mark upload as done: invoke callback, emit event, then cancel/clear. */
    handleDone(): void {
        this.callbacks.onDoneClicked?.()
        this.core.emit('done', {})
        this.handleCancel()
    }

    /** Full state reset: clear isAddingMore, emit state-reset, then handleDone. */
    resetState(): void {
        this.setState({ isAddingMore: false })
        this.core.emit('state-reset', {})
        this.handleDone()
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
