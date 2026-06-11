import { html, nothing } from 'lit-html'
import type { UploadFile } from '@upup/core'
import { cn } from '../lib/cn'
import type { RootContext } from '../lib/types'
import { filePreview } from './file-preview'
import { filePreviewPortal } from './file-preview-portal'

export interface FileItemState { canPreview: boolean; showPreviewPortal: boolean }
const stateMap = new WeakMap<UploadFile, FileItemState>()
function stateFor(file: UploadFile): FileItemState {
  let s = stateMap.get(file)
  if (!s) { s = { canPreview: false, showPreviewPortal: false }; stateMap.set(file, s) }
  return s
}

export function fileItem(ctx: RootContext, file: UploadFile) {
  const state = stateFor(file)
  const slot = ctx.theme.getSnapshot().slotOverrides
  const filesSize = ctx.core.files.size
  const openPortal = () => { state.showPreviewPortal = true; ctx.core.emit('file-preview-open', { fileId: file.id, fileName: file.name }); ctx.invalidate() }
  const closePortal = () => { state.showPreviewPortal = false; ctx.core.emit('file-preview-close', { fileId: file.id, fileName: file.name }); ctx.invalidate() }
  const stop = (e: MouseEvent) => e.stopPropagation()
  return html`
    <div
      data-testid="upup-file-item" data-upup-slot="file-item"
      class=${cn('upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent', {
        [slot.fileItemMultiple ?? '']: !!slot.fileItemMultiple && filesSize > 1,
        [slot.fileItemSingle ?? '']: !!slot.fileItemSingle && filesSize === 1,
      })}
    >
      ${filePreview(ctx, file, state, { onRequestPreview: openPortal })}
      ${state.canPreview && state.showPreviewPortal
        ? filePreviewPortal(ctx, { fileType: file.type ?? '', fileUrl: file.url ?? '', fileName: file.name, fileSize: file.size, onClose: closePortal, onStopPropagation: stop })
        : nothing}
    </div>`
}
