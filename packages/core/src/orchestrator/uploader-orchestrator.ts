import { UploadStatus } from '../types/upload-status'
import type { FileSource } from '../types/file-source'
import type { UploadFile } from '../types/upload-file'
import type { UpupCore } from '../core'
import type { OrchestratorState, OrchestratorCallbacks } from './types'
import { revokeFileUrl } from '../utils/file-helpers'
import { dataURLtoBlob, blobToUploadFile, revokeAndReplace } from '../utils/image-helpers'
import type { UploadResult } from '../contracts-strategies'
import { UpupError } from '../errors'

export class UploaderOrchestrator {
    private state: OrchestratorState
    private listeners = new Set<() => void>()
    private core: UpupCore
    private callbacks: OrchestratorCallbacks
    private unsubs: (() => void)[] = []
    private disposed = false

    constructor(core: UpupCore, callbacks: OrchestratorCallbacks) {
        this.core = core
        this.callbacks = callbacks
        this.state = {
            files: new Map(),
            uploadStatus: UploadStatus.IDLE,
            uploadError: '',
            uploadErrorCode: undefined,
            totalProgress: 0,
            filesProgressMap: {},
            uploadSpeed: 0,
            uploadEta: 0,
            uploadedBytes: 0,
            totalBytes: 0,
            activeSource: undefined,
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

    /** Remove a file by id: revoke its blob URL, then delegate to core. */
    removeFile(fileId: string): void {
        const file = this.state.files.get(fileId)
        if (file) revokeFileUrl(file)
        this.core.removeFile(fileId)
    }

    /** Set the active upload source. */
    setActiveSource(source: FileSource | undefined): void {
        this.setState({ activeSource: source })
    }

    /** Toggle between grid and list view. */
    setViewMode(mode: 'grid' | 'list'): void {
        this.setState({ viewMode: mode })
    }

    /** Toggle the "adding more files" state. */
    setIsAddingMore(value: boolean): void {
        this.setState({ isAddingMore: value })
    }

    // ── Upload control methods ──────────────────────────────────────

    /** Trigger upload for all current files. Calls onPrepareFiles if provided. */
    async startUpload(): Promise<UploadFile[] | undefined> {
        const currentFiles = [...this.state.files.values()]
        if (currentFiles.length === 0) return undefined
        this.setState({ uploadError: '', uploadErrorCode: undefined })

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
        this.setState({ uploadError: '', uploadErrorCode: undefined })
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

    // ── Image editor methods ────────────────────────────────────────

    /** Open the image editor for a given file. Invokes onOpen callback and emits event. */
    openImageEditor(file: UploadFile): void {
        this.setState({ editingFile: file })
        this.callbacks.imageEditorOptions?.onOpen?.(file)
        this.core.emit('image-editor-open', { file })
    }

    /**
     * Close the image editor without saving. Invokes onCancel callback.
     * If the editor queue is non-empty, the next file is automatically opened.
     */
    closeImageEditor(): void {
        const current = this.state.editingFile
        this.setState({ editingFile: null })
        if (current) {
            this.callbacks.imageEditorOptions?.onCancel?.(current)
            this.core.emit('image-editor-cancel', { file: current })
        }
        this.processEditorQueue()
    }

    /**
     * Save an edited image. Converts the data URL to a blob, creates a new
     * UploadFile preserving the original's identity, replaces it in state
     * and core, then invokes the onSave callback.
     */
    saveImageEdit(editedImageData: string, mimeType?: string): void {
        const editing = this.state.editingFile
        if (!editing) return

        const opts = this.callbacks.imageEditorOptions
        const outputMime = mimeType || opts?.output?.mimeType || editing.type
        const blob = new Blob([dataURLtoBlob(editedImageData)], { type: outputMime })
        const newFile = blobToUploadFile(blob, editing, opts?.output)

        // Replace in orchestrator state (revokes old blob URL)
        const nextFiles = revokeAndReplace(this.state.files, editing.id, newFile)
        this.setState({ files: nextFiles, editingFile: null })

        // Replace in core so the upload pipeline sees the edited file
        this.core.replaceFile(editing.id, newFile)

        opts?.onSave?.(newFile, editing)
        this.core.emit('image-editor-save', { file: newFile, original: editing })
        this.processEditorQueue()
    }

    /** Replace a single file in state by id (revokes old blob URL). Also replaces in core. */
    replaceFile(fileId: string, newFile: UploadFile): void {
        const nextFiles = revokeAndReplace(this.state.files, fileId, newFile)
        this.setState({ files: nextFiles })
        this.core.replaceFile(fileId, newFile)
    }

    /** Enqueue files for auto-opening in the image editor. */
    enqueueForEditor(files: UploadFile[]): void {
        if (files.length === 0) return
        this.setState({ editorQueue: [...this.state.editorQueue, ...files] })
        // If nothing is currently being edited, process the queue immediately
        if (!this.state.editingFile) {
            this.processEditorQueue()
        }
    }

    /** Pop the next file from the editor queue and open it. */
    private processEditorQueue(): void {
        if (this.state.editingFile || this.state.editorQueue.length === 0) return
        const [next, ...rest] = this.state.editorQueue
        this.setState({ editorQueue: rest })
        this.openImageEditor(next)
    }

    // ── Lifecycle ────────────────────────────────────────────────────

    private speedSamples: { time: number; bytes: number }[] = []

    /**
     * Project orchestrator state from core — the single source of truth (F-145).
     * `uploadStatus` is derived from the `status` each status-carrying `state-change`
     * event supplies (core sets `_status` before every such emit); the discrete
     * upload-start/upload-all-complete/upload-error listeners no longer write it. `files`
     * is rebuilt from `core.files`, and is a no-op when the file set is unchanged (same
     * size + ordered ids + same UploadFile refs) so the `files` reference stays stable
     * across the many status-only `state-change` events core emits during upload —
     * preserving referential stability for useSyncExternalStore / computed consumers.
     */
    private projectFromCore(payload?: { status?: UploadStatus }): void {
        const partial: Partial<OrchestratorState> = {}
        if (payload?.status !== undefined) partial.uploadStatus = payload.status
        const coreFiles = this.core.files
        if (this.filesProjectionChanged(coreFiles)) {
            partial.files = new Map(coreFiles)
            partial.totalBytes = [...coreFiles.values()].reduce((sum, f) => sum + f.size, 0)
        }
        if (Object.keys(partial).length > 0) this.setState(partial)
    }

    private filesProjectionChanged(coreFiles: ReadonlyMap<string, UploadFile>): boolean {
        const current = this.state.files
        if (current.size !== coreFiles.size) return true
        const a = current.entries()
        const b = coreFiles.entries()
        // positional compare: key (value[0]) then UploadFile identity (value[1])
        for (let x = a.next(), y = b.next(); !x.done && !y.done; x = a.next(), y = b.next()) {
            if (x.value[0] !== y.value[0] || x.value[1] !== y.value[1]) return true
        }
        return false
    }

    init(): void {
        // ── upload-start (callback only; uploadStatus is projected from state-change) ──
        this.unsubs.push(
            this.core.on('upload-start', () => {
                this.callbacks.onUploadStart?.()
            }),
        )

        // ── file-upload-start ───────────────────────────────────
        this.unsubs.push(
            this.core.on('file-upload-start', (payload: { file: UploadFile }) => {
                this.callbacks.onFileUploadStart?.(payload.file)
            }),
        )

        // ── state-change (single source: projects uploadStatus + files from core) ──
        this.unsubs.push(
            this.core.on('state-change', (payload: { status?: UploadStatus }) => this.projectFromCore(payload)),
        )

        // ── files-added (side-effects only; the map is owned by state-change) ──
        this.unsubs.push(
            this.core.on('files-added', (added: UploadFile[]) => {
                if (!Array.isArray(added) || added.length === 0) return

                this.callbacks.onFilesSelected?.(added)

                // Image editor auto-open
                const editorOpts = this.callbacks.imageEditorOptions
                if (editorOpts?.enabled) {
                    const images = added.filter(file => file.type.startsWith('image/'))
                    if (editorOpts.autoOpen === 'single' && images.length === 1) {
                        this.enqueueForEditor([images[0]])
                    }
                    if (editorOpts.autoOpen === 'always' && images.length > 0) {
                        this.enqueueForEditor(images)
                    }
                }

                // Auto-upload
                if (this.callbacks.autoUpload) {
                    this.core.emit('auto-upload', { count: added.length })
                    // Guard the deferred run: an unmount that races this 0-ms timer must not
                    // hit the now-terminal core.upload() (F-148). Swallow if it still does.
                    setTimeout(() => {
                        if (this.disposed) return
                        void this.core.upload().catch(() => {})
                    }, 0)
                }
            }),
        )

        // ── file-removed (callback only; the map is owned by state-change) ──
        this.unsubs.push(
            this.core.on('file-removed', (file: UploadFile) => {
                this.callbacks.onFileRemoved?.(file)
            }),
        )

        // Note: files-cleared is NOT subscribed here. The state-change listener
        // above (subscribed to core.on('state-change')) rebuilds the projection
        // from core.files on every mutation, including removeAll(). core.removeAll()
        // emits state-change before files-cleared, so the projection is already
        // empty by the time files-cleared would fire.

        // ── upload-progress ─────────────────────────────────────
        this.unsubs.push(
            this.core.on('upload-progress', (progress: { fileId: string; loaded: number; total: number }) => {
                const nextProgressMap = {
                    ...this.state.filesProgressMap,
                    [progress.fileId]: {
                        id: progress.fileId,
                        loaded: progress.loaded,
                        total: progress.total,
                    },
                }

                const now = Date.now()
                const nextUploaded = Object.values(nextProgressMap)
                    .reduce((sum, item) => sum + item.loaded, 0)

                // Speed / ETA calculation
                this.speedSamples.push({ time: now, bytes: nextUploaded })
                this.speedSamples = this.speedSamples.filter(s => s.time >= now - 3000)

                let speed = this.state.uploadSpeed
                let eta = this.state.uploadEta
                if (this.speedSamples.length >= 2) {
                    const oldest = this.speedSamples[0]
                    const newest = this.speedSamples[this.speedSamples.length - 1]
                    const elapsed = (newest.time - oldest.time) / 1000
                    if (elapsed > 0) {
                        speed = Math.max(0, (newest.bytes - oldest.bytes) / elapsed)
                        const remaining = this.state.totalBytes - nextUploaded
                        eta = speed > 0 ? Math.ceil(remaining / speed) : 0
                    }
                }

                this.setState({
                    filesProgressMap: nextProgressMap,
                    uploadedBytes: nextUploaded,
                    uploadSpeed: speed,
                    uploadEta: eta,
                })

                // Per-file callback
                const file = this.state.files.get(progress.fileId)
                if (file) {
                    this.callbacks.onFileUploadProgress?.(file, {
                        loaded: progress.loaded,
                        total: progress.total,
                        percentage: progress.total > 0
                            ? Math.round((progress.loaded / progress.total) * 100)
                            : 0,
                    })
                }

                // Aggregate callback
                this.callbacks.onFilesUploadProgress?.(
                    this.core.progress.completedFiles,
                    this.core.progress.totalFiles,
                )
            }),
        )

        // ── upload-success (per file) ───────────────────────────
        this.unsubs.push(
            this.core.on('upload-success', (payload: { file: UploadFile; result: UploadResult }) => {
                this.callbacks.onFileUploadComplete?.(
                    payload.file,
                    payload.result?.key ?? (payload.file as UploadFile & { key?: string }).key ?? '',
                )
            }),
        )

        // ── upload-all-complete (callbacks only; SUCCESSFUL is projected from state-change) ──
        this.unsubs.push(
            this.core.on('upload-all-complete', (completed: UploadFile[]) => {
                this.callbacks.onFilesUploadComplete?.(completed)
                this.callbacks.onUploadComplete?.(completed)
            }),
        )

        // ── upload-error (error message + code only; FAILED is projected from state-change) ──
        this.unsubs.push(
            this.core.on('upload-error', (payload: { error: Error; file?: UploadFile }) => {
                const message = payload.error.message
                const code = payload.error instanceof UpupError ? payload.error.code : undefined
                this.setState({ uploadError: message, uploadErrorCode: code })
                this.callbacks.onError?.(message)
            }),
        )

        // ── online/offline detection ────────────────────────────
        if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.addEventListener === 'function') {
            const handleOnline = () => {
                this.setState({ isOnline: true })
                this.core.emit('connection-online', {})
            }
            const handleOffline = () => {
                this.setState({ isOnline: false })
                this.core.emit('connection-offline', {})
            }
            globalThis.window.addEventListener('online', handleOnline)
            globalThis.window.addEventListener('offline', handleOffline)
            this.unsubs.push(() => {
                globalThis.window.removeEventListener('online', handleOnline)
                globalThis.window.removeEventListener('offline', handleOffline)
            })

            // Set initial value
            if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
                this.setState({ isOnline: navigator.onLine })
            }
        }
    }

    destroy(): void {
        this.disposed = true
        this.state.files.forEach(file => revokeFileUrl(file))
        this.unsubs.forEach(u => u())
        this.unsubs = []
        this.speedSamples = []
        this.listeners.clear()
    }
}
