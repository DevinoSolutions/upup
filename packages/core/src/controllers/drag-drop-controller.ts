import { collectDroppedFiles } from '../folder-drop'
import { isUploadActive } from '../utils/status-helpers'
import type { UpupCore } from '../core'
import type { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { ObservableController } from './types'

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
  /** Getter so frameworks that re-read options each render (React) stay fresh. */
  options: () => DragDropOptions
  /** Getter so frameworks that re-read props each render (React) stay fresh. */
  props: () => DragDropProps
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
    this.unsubOrchestrator = this.deps.orchestrator.subscribe(() => this.recompute())
    this.recompute()
  }

  private get disabled(): boolean {
    const p = this.deps.props()
    const o = this.deps.orchestrator.getSnapshot()
    return p.disableDragDrop || !!o.activeAdapter || isUploadActive(o.uploadStatus)
  }

  private compute(): DragDropSnapshot {
    const o = this.deps.orchestrator.getSnapshot()
    const filesSize = this.deps.core.files.size
    const active = o.activeAdapter
    const isAddingMore = o.isAddingMore
    return {
      isDragging: this.isDragging,
      absoluteIsDragging: this.isDragging && !active,
      absoluteHasBorder: (!filesSize || isAddingMore || this.isDragging) && !active,
    }
  }

  private recompute(): void {
    const next = this.compute()
    const prev = this.snapshot
    if (
      next.isDragging === prev.isDragging &&
      next.absoluteIsDragging === prev.absoluteIsDragging &&
      next.absoluteHasBorder === prev.absoluteHasBorder
    ) return
    this.snapshot = next
    this.notify()
  }

  private notify(): void {
    this.listeners.forEach(fn => fn())
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

  async handleDrop(e: DragEvent): Promise<void> {
    if (this.disabled || this.deps.props().isProcessing) return
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
      this.deps.options().onWarn?.(
        dropped.length > 0
          ? 'Dropped folders were ignored because folderUpload.allowDrop is disabled.'
          : 'Folder drop is disabled. Enable folderUpload.allowDrop to accept dropped folders.',
      )
      this.deps.core.emit('folder-drop-blocked', { acceptedFiles: dropped.length })
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
    if (!this.deps.options().enablePaste || this.deps.props().isProcessing) return
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const f = item.getAsFile()
        if (f) {
          const name = f.name === 'image.png' || !f.name
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

  dispose(): void {
    this.unsubOrchestrator?.()
    this.unsubOrchestrator = null
    this.listeners.clear()
    this.isDragging = false
  }
}
