import { html, nothing, type TemplateResult } from 'lit-html'
import { UploadStatus } from '@upupjs/core'
import { cn } from '../lib/cn'
import type { UploaderContext } from '../lib/types'
import { sourceView } from './source-view'
import { sourceSelector } from './source-selector'
import { fileList } from './file-list'

export function uploaderPanel(ctx: UploaderContext): TemplateResult {
    const o = ctx.orchestrator.getSnapshot()
    const isDark = ctx.theme.getSnapshot().isDark
    const tr = ctx.translations
    const dd = ctx.controllers.dragDrop.getSnapshot()
    const filesSize = o.files.size
    const activeSource = o.activeSource
    const isAddingMore = o.isAddingMore
    const isOnline = o.isOnline

    const uploadAnnouncement =
        o.uploadStatus === UploadStatus.UPLOADING
            ? tr.announceUploadStarted
            : o.uploadStatus === UploadStatus.SUCCESSFUL
              ? tr.announceUploadComplete
              : o.uploadStatus === UploadStatus.FAILED
                ? tr.announceUploadFailed
                : ''
    return html`
        <div
            data-testid="upup-dropzone"
            data-upup-slot="uploader-panel"
            role="region"
            aria-label=${tr.dropzoneLabel}
            aria-dropeffect=${dd.isDragging ? 'copy' : 'none'}
            @dragover=${(e: DragEvent) => {
                ctx.controllers.dragDrop.handleDragOver(e)
            }}
            @dragleave=${(e: DragEvent) => {
                ctx.controllers.dragDrop.handleDragLeave(e)
            }}
            @drop=${(e: DragEvent) => ctx.controllers.dragDrop.handleDrop(e)}
            @paste=${(e: ClipboardEvent) => {
                ctx.controllers.dragDrop.handlePaste(e)
            }}
            class=${cn(
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
                {
                    'upup-border upup-border-[#0ea5e9]': dd.absoluteHasBorder,
                    'upup-border-[#38bdf8] dark:upup-border-[#38bdf8]':
                        dd.absoluteHasBorder && isDark,
                    'upup-border-dashed': !dd.isDragging,
                    // Idle drag-drop hint: pulse the dashed border between a muted
                    // slate and the sky accent while the panel is empty and at rest.
                    // Border-color only (no width/layout change); paused whenever a
                    // drag, file, active source, or add-more flow is in progress.
                    'upup-animate-hint-pulse motion-reduce:upup-animate-none':
                        dd.absoluteHasBorder &&
                        !dd.isDragging &&
                        !filesSize &&
                        !activeSource &&
                        !isAddingMore,
                    'upup-bg-[#e0f2fe] upup-backdrop-blur-sm':
                        dd.absoluteIsDragging && !isDark,
                    'upup-bg-[#0b2a3a] upup-backdrop-blur-sm dark:upup-bg-[#0b2a3a]':
                        dd.absoluteIsDragging && isDark,
                },
            )}
        >
            <div role="status" aria-live="polite" class="upup-sr-only">
                ${uploadAnnouncement}
            </div>
            ${
                !isOnline
                    ? html`
                          <div
                              class=${cn(
                                  'upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                                  { 'upup-bg-yellow-600': isDark },
                              )}
                          >
                              No internet connection — uploads will resume when
                              you reconnect.
                          </div>
                      `
                    : nothing
            }
            ${activeSource ? sourceView(ctx) : nothing}
            ${
                !activeSource && (isAddingMore || !filesSize)
                    ? sourceSelector(ctx)
                    : nothing
            }
            ${fileList(ctx)}
        </div>
    `
}
