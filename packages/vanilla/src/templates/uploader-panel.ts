import { html, nothing } from 'lit-html'
import { cn } from '../lib/cn'
import type { UploaderContext } from '../lib/types'
import { sourceView } from './source-view'
import { sourceSelector } from './source-selector'
import { fileList } from './file-list'

export function uploaderPanel(ctx: UploaderContext) {
  const o = ctx.orchestrator.getSnapshot()
  const isDark = ctx.theme.getSnapshot().isDark
  const tr = ctx.translations
  const dd = ctx.controllers.dragDrop.getSnapshot()
  const filesSize = o.files.size
  const activeSource = o.activeSource
  const isAddingMore = o.isAddingMore
  const isOnline = o.isOnline

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const el = ctx.getFileInput()
      if (el) { el.removeAttribute('webkitdirectory'); el.removeAttribute('directory') }
      ctx.openFilePicker()
    }
  }
  return html`
    <div
      data-testid="upup-dropzone"
      data-upup-slot="main-box"
      role="button"
      tabindex="0"
      aria-label=${tr.dropzoneLabel}
      aria-dropeffect=${dd.isDragging ? 'copy' : 'none'}
      @keydown=${onKeyDown}
      @dragover=${(e: DragEvent) => ctx.controllers.dragDrop.handleDragOver(e)}
      @dragleave=${(e: DragEvent) => ctx.controllers.dragDrop.handleDragLeave(e)}
      @drop=${(e: DragEvent) => ctx.controllers.dragDrop.handleDrop(e)}
      @paste=${(e: ClipboardEvent) => ctx.controllers.dragDrop.handlePaste(e)}
      class=${cn('upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg', {
        'upup-border upup-border-[#1849D6]': dd.absoluteHasBorder,
        'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]': dd.absoluteHasBorder && isDark,
        'upup-border-dashed': !dd.isDragging,
        'upup-bg-[#E7ECFC] upup-backdrop-blur-sm': dd.absoluteIsDragging && !isDark,
        'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]': dd.absoluteIsDragging && isDark,
      })}
    >
      ${!isOnline ? html`
        <div class=${cn('upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500', { 'upup-bg-yellow-600': isDark })}>
          No internet connection — uploads will resume when you reconnect.
        </div>
      ` : nothing}
      ${activeSource ? sourceView(ctx) : nothing}
      ${!activeSource && (isAddingMore || !filesSize) ? sourceSelector(ctx) : nothing}
      ${fileList(ctx)}
    </div>
  `
}
