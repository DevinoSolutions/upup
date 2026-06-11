import { collectDroppedFiles, isUploadActive } from '@upup/core'
import type { UpupCore, UploaderOrchestrator } from '@upup/core'
import type { UploaderController, RootContextProps, CreateUploaderOptions } from '../lib/types'

export interface DragDropDeps {
  core: UpupCore
  orchestrator: UploaderOrchestrator
  setFiles: (files: File[]) => Promise<void>
  options: CreateUploaderOptions
  props: () => RootContextProps
  invalidate: () => void
}

export interface DragDropSnapshot {
  isDragging: boolean
  absoluteIsDragging: boolean
  absoluteHasBorder: boolean
}

export class DragDropController implements UploaderController<DragDropSnapshot> {
  private isDragging = false

  constructor(private deps: DragDropDeps) {
    this.handleDragOver = this.handleDragOver.bind(this)
    this.handleDragLeave = this.handleDragLeave.bind(this)
    this.handleDrop = this.handleDrop.bind(this)
    this.handlePaste = this.handlePaste.bind(this)
  }

  private get disabled(): boolean {
    const p = this.deps.props()
    const o = this.deps.orchestrator.getSnapshot()
    return p.disableDragDrop || !!o.activeAdapter || isUploadActive(o.uploadStatus)
  }

  getSnapshot(): DragDropSnapshot {
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

  handleDragOver(e: DragEvent) {
    if (this.disabled || this.deps.props().isProcessing) return
    e.preventDefault()
    this.isDragging = true
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    const dropped = Array.from(e.dataTransfer?.files || [])
    this.deps.options.onFilesDragOver?.(dropped)
    this.deps.core.emit('drag-over', {})
    this.deps.invalidate()
  }

  handleDragLeave(e: DragEvent) {
    if (this.disabled || this.deps.props().isProcessing) return
    e.preventDefault()
    this.isDragging = false
    const dropped = Array.from(e.dataTransfer?.files || [])
    this.deps.options.onFilesDragLeave?.(dropped)
    this.deps.core.emit('drag-leave', {})
    this.deps.invalidate()
  }

  async handleDrop(e: DragEvent) {
    if (this.disabled || this.deps.props().isProcessing) return
    e.preventDefault()
    if (!e.dataTransfer) {
      this.isDragging = false
      this.deps.invalidate()
      return
    }
    const { files: dropped, skippedDirectory } = await collectDroppedFiles(
      e.dataTransfer,
      this.deps.props().folderUploadAllowDrop,
    )
    if (skippedDirectory) {
      this.deps.options.onWarn?.(
        dropped.length > 0
          ? 'Dropped folders were ignored because folderUpload.allowDrop is disabled.'
          : 'Folder drop is disabled. Enable folderUpload.allowDrop to accept dropped folders.',
      )
      this.deps.core.emit('folder-drop-blocked', { acceptedFiles: dropped.length })
      if (dropped.length === 0) {
        this.isDragging = false
        this.deps.invalidate()
        return
      }
    }
    this.deps.options.onFilesDrop?.(dropped)
    void this.deps.setFiles(dropped)
    this.deps.core.emit('drop', { files: dropped })
    this.isDragging = false
    this.deps.invalidate()
  }

  handlePaste(e: ClipboardEvent) {
    if (!this.deps.options.enablePaste || this.deps.props().isProcessing) return
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

  dispose() {
    this.isDragging = false
  }
}
