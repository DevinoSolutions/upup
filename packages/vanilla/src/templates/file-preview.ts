import { html, nothing } from 'lit-html'
import type { TemplateResult } from 'lit-html'
import type { UploadFile, Translations } from '@upup/core'
import { fileGetIsImage, cn } from '@upup/core/internal'
import type { UploaderContext } from '../lib/types'
import { progressBar } from './shared/progress-bar'
import { filePreviewThumbnail } from './file-preview-thumbnail'
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
    opts: { onRequestPreview: () => void },
): TemplateResult {
    const tr = ctx.translations
    const slot = ctx.theme.getSnapshot().slotOverrides
    const themeSlots = ctx.theme.getSnapshot().slots
    const { isDark } = ctx.theme.getSnapshot()

    const fileType = file.type
    const fileName = file.name
    const fileUrl = file.url ?? ''
    const fileSize = file.size
    const fileId = file.id

    const isImage = fileGetIsImage(fileType)
    const filesSize = ctx.core.files.size

    const m = ctx.orchestrator.getSnapshot().filesProgressMap[fileId]
    const progress = m ? Math.floor((m.loaded / m.total) * 100) : 0

    const { allowPreview, imageEditor, isProcessing } = ctx.props

    const onCanPreview = () => {
        state.canPreview = true
        ctx.invalidate()
    }

    const onHandleFileRemove = (e: MouseEvent) => {
        e.stopPropagation()
        ctx.handleFileRemove(fileId)
    }

    const onHandleEditImage = (e: MouseEvent) => {
        e.stopPropagation()
        ctx.orchestrator.openImageEditor(file)
    }

    // no-op — vanilla has no onFileClick option in v1; keeps markup parity
    const onFileClick = () => {}

    return html` <div
        class=${cn('upup-inline-block', themeSlots.filePreview?.root)}
        data-testid="upup-file-preview"
        data-upup-slot="file-preview"
        role="button"
        tabindex="0"
        @click=${onFileClick}
        @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') onFileClick()
        }}
    >
        <div
            class=${cn(
                'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
                'upup-bg-contain upup-bg-center upup-bg-no-repeat',
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
            ${
                !isImage
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
                isImage && imageEditor.enabled
                    ? html` <button
                          class=${cn(
                              'upup-absolute upup-right-1.5 upup-top-8 upup-z-10',
                              'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                              'upup-rounded-full upup-bg-white upup-text-blue-600 upup-shadow-sm',
                              'hover:upup-bg-white hover:upup-text-blue-700',
                              'upup-ring-1 upup-ring-black/5',
                              'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                          )}
                          @click=${onHandleEditImage}
                          type="button"
                          ?disabled=${!!progress || isProcessing}
                          aria-label=${tr.editImage}
                      >
                          <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              class="upup-h-3 upup-w-3"
                              aria-hidden="true"
                          >
                              <path
                                  d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"
                              />
                          </svg>
                      </button>`
                    : nothing
            }

            <button
                class=${cn(
                    'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                    'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                    'upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm',
                    'hover:upup-bg-white hover:upup-text-red-700',
                    'upup-ring-1 upup-ring-black/5',
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
                ${icon('trash', { class: 'upup-h-3 upup-w-3' })}
            </button>

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
                              'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#2563eb] upup-transition-all hover:upup-text-blue-700 hover:upup-underline',
                              {
                                  'upup-text-[#4A9EFF] hover:upup-text-blue-300':
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
