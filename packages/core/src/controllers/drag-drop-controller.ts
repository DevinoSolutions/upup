import { collectDroppedFiles } from '../folder-drop'
import { isUploadActive } from '../utils/status-helpers'
import { FileSource } from '../types/file-source'
import type { UpupCore } from '../core'
import type { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { ObservableController } from './types'

/**
 * The read-only cloud-drive pickers. A file dropped while one of these is the
 * active source can't be added (the picker browses a remote drive, it doesn't
 * accept OS drops) — the drop is rejected with a toast instead of silently
 * ignored. Every OTHER view (idle, file list, the source selector, camera,
 * screen, audio) keeps its existing drop behavior.
 */
const READONLY_DRIVE_SOURCES: ReadonlySet<FileSource> = new Set([
    FileSource.GOOGLE_DRIVE,
    FileSource.ONE_DRIVE,
    FileSource.DROPBOX,
    FileSource.BOX,
])

/** The subset of uploader options the dropzone reads. */
export interface DragDropOptions {
    enablePaste?: boolean
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onWarn?: (message: string) => void
}

/** The subset of resolved props the dropzone reads. */
export interface DragDropProps {
    disableDragDrop: boolean
    isProcessing: boolean
    folderUploadAllowDrop: boolean
}

export interface DragDropDeps {
    core: UpupCore
    orchestrator: UploaderOrchestrator
    setFiles: (files: File[]) => void | Promise<void>
    /**
     * Current selected-file count, read fresh on each recompute. Each host MUST
     * supply the SAME source its file list renders from, so the dropzone border
     * (`absoluteHasBorder`) stays in lockstep with the visible files:
     *   - React / Vue / Svelte / Angular → `orchestrator.getSnapshot().files.size`
     *     (their lists derive from the orchestrator snapshot, which is now a
     *     projection of core.files refreshed on every `state-change` event)
     *   - Vanilla                        → `core.files.size` (its list reads core)
     * Both sources are now in sync after every file mutation: the orchestrator
     * files map is rebuilt from `core.files` on each `state-change`, so
     * `orchestrator.getSnapshot().files.size` always equals `core.files.size`
     * after any mutation completes.
     */
    filesSize: () => number
    /** Getter so frameworks that re-read options each render (React) stay fresh. */
    options: () => DragDropOptions
    /** Getter so frameworks that re-read props each render (React) stay fresh. */
    props: () => DragDropProps
    /**
     * Invoked when a file is dropped while a read-only drive picker is the
     * active source (see `READONLY_DRIVE_SOURCES`). The host resolves the human
     * provider label and raises the drop-rejection toast (core transient-UI
     * store). When omitted, such a drop is silently ignored (the prior
     * behavior). Core owns the DECISION (which source, that files were dropped);
     * the host owns the i18n label + toast.
     */
    onReadonlyDropRejected?: (source: FileSource) => void
}

export interface DragDropSnapshot {
    isDragging: boolean
    absoluteIsDragging: boolean
    absoluteHasBorder: boolean
}

export class DragDropController implements ObservableController<DragDropSnapshot> {
    private isDragging = false
    private snapshot: DragDropSnapshot
    private listeners = new Set<() => void>()
    private unsubOrchestrator: (() => void) | null = null

    constructor(private deps: DragDropDeps) {
        this.handleDragOver = this.handleDragOver.bind(this)
        this.handleDragLeave = this.handleDragLeave.bind(this)
        this.handleDrop = this.handleDrop.bind(this)
        this.handlePaste = this.handlePaste.bind(this)
        this.snapshot = this.compute()
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot = (): DragDropSnapshot => this.snapshot

    /** Subscribe to the orchestrator so border/dragging derive on change. Call on mount. Idempotent. */
    init(): void {
        if (this.unsubOrchestrator) return
        this.unsubOrchestrator = this.deps.orchestrator.subscribe(() => {
            this.recompute()
        })
        this.recompute()
    }

    private get disabled(): boolean {
        const p = this.deps.props()
        const o = this.deps.orchestrator.getSnapshot()
        return (
            p.disableDragDrop ||
            !!o.activeSource ||
            isUploadActive(o.uploadStatus)
        )
    }

    private compute(): DragDropSnapshot {
        const o = this.deps.orchestrator.getSnapshot()
        const filesSize = this.deps.filesSize()
        const active = o.activeSource
        const isAddingMore = o.isAddingMore
        return {
            isDragging: this.isDragging,
            absoluteIsDragging: this.isDragging && !active,
            absoluteHasBorder:
                (!filesSize || isAddingMore || this.isDragging) && !active,
        }
    }

    /**
     * Recompute the cached snapshot from current inputs and notify if it changed.
     * Runs automatically on drag events and orchestrator changes. Hosts may also call
     * it to refresh after external state the controller cannot observe via the
     * orchestrator — e.g. a framework that removes files through `core.removeFile`
     * directly (which emits no orchestrator notify), leaving the file-count-derived
     * `absoluteHasBorder` stale.
     */
    recompute(): void {
        const next = this.compute()
        const prev = this.snapshot
        if (
            next.isDragging === prev.isDragging &&
            next.absoluteIsDragging === prev.absoluteIsDragging &&
            next.absoluteHasBorder === prev.absoluteHasBorder
        )
            return
        this.snapshot = next
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach(fn => {
            fn()
        })
    }

    handleDragOver(e: DragEvent): void {
        if (this.disabled || this.deps.props().isProcessing) return
        e.preventDefault()
        this.isDragging = true
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        const dropped = Array.from(e.dataTransfer?.files || [])
        this.deps.options().onFilesDragOver?.(dropped)
        this.deps.core.emit('drag-over', {})
        this.recompute()
    }

    handleDragLeave(e: DragEvent): void {
        if (this.disabled || this.deps.props().isProcessing) return
        e.preventDefault()
        this.isDragging = false
        const dropped = Array.from(e.dataTransfer?.files || [])
        this.deps.options().onFilesDragLeave?.(dropped)
        this.deps.core.emit('drag-leave', {})
        this.recompute()
    }

    /** True when the drag payload carries at least one file. */
    private dropHasFiles(e: DragEvent): boolean {
        const dt = e.dataTransfer
        if (!dt) return false
        if (dt.files && dt.files.length > 0) return true
        const types = dt.types ? Array.from(dt.types) : []
        if (types.includes('Files')) return true
        return dt.items
            ? Array.from(dt.items).some(i => i.kind === 'file')
            : false
    }

    async handleDrop(e: DragEvent): Promise<void> {
        const p = this.deps.props()
        if (p.isProcessing || p.disableDragDrop) return
        // Read-only drive picker active: reject the drop (toast), don't add.
        const active = this.deps.orchestrator.getSnapshot().activeSource
        if (
            active &&
            READONLY_DRIVE_SOURCES.has(active) &&
            this.dropHasFiles(e) &&
            this.deps.onReadonlyDropRejected
        ) {
            e.preventDefault()
            this.deps.onReadonlyDropRejected(active)
            this.isDragging = false
            this.recompute()
            return
        }
        if (this.disabled) return
        e.preventDefault()
        if (!e.dataTransfer) {
            this.isDragging = false
            this.recompute()
            return
        }
        const { files: dropped, skippedDirectory } = await collectDroppedFiles(
            e.dataTransfer,
            this.deps.props().folderUploadAllowDrop,
        )
        if (skippedDirectory) {
            this.deps
                .options()
                .onWarn?.(
                    dropped.length > 0
                        ? 'Dropped folders were ignored because folderUpload.allowDrop is disabled.'
                        : 'Folder drop is disabled. Enable folderUpload.allowDrop to accept dropped folders.',
                )
            this.deps.core.emit('folder-drop-blocked', {
                acceptedFiles: dropped.length,
            })
            if (dropped.length === 0) {
                this.isDragging = false
                this.recompute()
                return
            }
        }
        this.deps.options().onFilesDrop?.(dropped)
        void this.deps.setFiles(dropped)
        this.deps.core.emit('drop', { files: dropped })
        this.isDragging = false
        this.recompute()
    }

    handlePaste(e: ClipboardEvent): void {
        if (!this.deps.options().enablePaste || this.deps.props().isProcessing)
            return
        const items = e.clipboardData?.items
        if (!items) return
        const files: File[] = []
        for (const item of Array.from(items)) {
            if (item.kind === 'file') {
                const f = item.getAsFile()
                if (f) {
                    const name =
                        f.name === 'image.png' || !f.name
                            ? `pasted-${Date.now()}.${f.type.split('/')[1] || 'png'}`
                            : f.name
                    files.push(new File([f], name, { type: f.type }))
                }
            }
        }
        if (files.length) {
            e.preventDefault()
            void this.deps.setFiles(files)
            this.deps.core.emit('paste', { files })
        }
    }

    destroy(): void {
        this.unsubOrchestrator?.()
        this.unsubOrchestrator = null
        this.listeners.clear()
        this.isDragging = false
    }
}
