import { html, nothing } from 'lit-html'
import type { TemplateResult } from 'lit-html'
import type { UploadFile, Translations } from '@upupjs/core'
import { UploadStatus } from '@upupjs/core'
import { fileGetIsImage, cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { progressBar } from './shared/progress-bar'
import { filePreviewThumbnail } from './file-preview-thumbnail'
import { fileSuccessCheck } from './shared/file-success-check'
import { icon } from './icon'

function formatFileSize(bytes: number | undefined, tr: Translations): string {
    if (!bytes || bytes === 0) return tr.zeroBytes
    const k = 1024
    const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i] ?? ''}`
}

export function filePreview(
    ctx: UploaderContext,
    file: UploadFile,
    state: { canPreview: boolean },
    opts: { onRequestPreview: () => void; index?: number },
): TemplateResult {
    const tr = ctx.translations
    const slot = ctx.theme.getSnapshot().slotOverrides
    const themeSlots = ctx.theme.getSnapshot().slots
    const { isDark } = ctx.theme.getSnapshot()
    const index = opts.index ?? 0

    const fileType = file.type
    const fileName = file.name
    const fileUrl = file.url ?? ''
    const fileSize = file.size
    const fileId = file.id

    const isImage = fileGetIsImage(fileType)
    const isVideo = (fileType ?? '').startsWith('video/')
    const filesSize = ctx.core.files.size

    const m = ctx.orchestrator.getSnapshot().filesProgressMap[fileId]
    const loaded = m?.loaded ?? NaN
    const total = m?.total ?? NaN
    const pctRaw = Math.floor((loaded / total) * 100)
    const progress = Number.isFinite(pctRaw) ? pctRaw : 0

    const isSuccessful = file.status === UploadStatus.SUCCESSFUL
    const { allowPreview } = ctx.props

    const onCanPreview = () => {
        state.canPreview = true
        ctx.invalidate()
    }

    const onHandleFileRemove = (e: MouseEvent) => {
        e.stopPropagation()
        ctx.handleFileRemove(fileId)
    }

    // no-op — vanilla has no onFileClick option; keeps markup parity
    const onFileClick = () => {}

    return html` <div
        class=${cn('upup-block upup-w-full', themeSlots.filePreview?.root)}
        data-testid="upup-file-preview"
        data-upup-slot="file-preview"
    >
        <div
            class=${cn(
                'upup-fx-hover-lift upup-relative upup-h-[160px] upup-w-full upup-overflow-hidden upup-rounded-xl upup-ring-1',
                'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                isDark
                    ? 'upup-bg-white/[0.055] upup-ring-white/[0.08]'
                    : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
                {
                    [slot.fileThumbnailMultiple ?? '']:
                        !!slot.fileThumbnailMultiple && filesSize > 1,
                    [slot.fileThumbnailSingle ?? '']:
                        !!slot.fileThumbnailSingle && filesSize === 1,
                },
                themeSlots.filePreview?.thumbnail,
            )}
            style=${isImage ? `background-image: url(${fileUrl})` : ''}
        >
            <button
                type="button"
                aria-label=${fileName}
                class="upup-absolute upup-inset-0 upup-z-0 upup-cursor-pointer"
                @click=${onFileClick}
            ></button>
            ${
                isVideo
                    ? html`<video
                          src=${fileUrl}
                          muted
                          playsinline
                          preload="metadata"
                          class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
                      ></video>`
                    : nothing
            }
            ${
                !isImage && !isVideo
                    ? html`
                          <div
                              class="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6"
                          >
                              ${filePreviewThumbnail(
                                  ctx,
                                  {
                                      canPreview: state.canPreview,
                                      fileType,
                                      fileName,
                                      fileUrl,
                                      fileSize,
                                      allowPreview,
                                  },
                                  onCanPreview,
                              )}
                          </div>
                      `
                    : nothing
            }
            ${
                !isSuccessful
                    ? html` <button
                          class=${cn(
                              'upup-fx-remove upup-fx-press upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                              'upup-flex upup-h-[30px] upup-w-[30px] upup-items-center upup-justify-center',
                              'upup-rounded-[8px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                              'hover:upup-bg-[#04080f]/65',
                              'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                              slot.fileDeleteButton,
                              themeSlots.filePreview?.deleteButton,
                          )}
                          @click=${onHandleFileRemove}
                          type="button"
                          ?disabled=${!!progress}
                          aria-label=${tr.removeFile}
                          data-testid="upup-file-remove"
                      >
                          ${icon('trash', { class: 'upup-h-5 upup-w-5' })}
                      </button>`
                    : nothing
            }
            ${
                isSuccessful
                    ? fileSuccessCheck({
                          index,
                          size: 20,
                          class: 'upup-absolute upup-left-1.5 upup-top-1.5 upup-z-10',
                      })
                    : nothing
            }
            ${progressBar(ctx, {
                progress,
                class: 'upup-absolute upup-bottom-0 upup-left-0 upup-right-0',
                progressBarClassName: 'upup-rounded-t-none upup-rounded-b-md',
            })}
        </div>

        <div class="upup-mt-1 upup-px-0.5">
            <div
                class=${cn(
                    'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
                    { 'upup-text-white': isDark },
                    themeSlots.filePreview?.name,
                )}
            >
                ${fileName}
            </div>
            <div
                class=${cn(
                    'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
                    { 'upup-text-gray-400': isDark },
                    themeSlots.filePreview?.size,
                )}
            >
                ${formatFileSize(fileSize, tr)}
            </div>
            ${
                allowPreview && state.canPreview
                    ? html` <button
                          type="button"
                          class=${cn(
                              'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#0284c7] upup-transition-all hover:upup-text-[#0284c7] hover:upup-underline',
                              {
                                  'upup-text-[#38bdf8] hover:upup-text-[#7dd3fc]':
                                      isDark,
                              },
                              themeSlots.filePreview?.previewButton,
                          )}
                          @click=${() => {
                              opts.onRequestPreview()
                          }}
                      >
                          ${tr.clickToPreview}
                      </button>`
                    : nothing
            }
        </div>
    </div>`
}
