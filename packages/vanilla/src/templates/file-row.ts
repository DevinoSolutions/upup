import { html, nothing, type TemplateResult } from 'lit-html'
import {
    UploadStatus,
    fileTypeIconName,
    type UploadFile,
    type Translations,
    type IconName,
} from '@upupjs/core'
import { fileGetExtension, fileGetIsImage, cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { progressBar } from './shared/progress-bar'
import { fileSuccessCheck } from './shared/file-success-check'
import { icon } from './icon'

const ARCHIVE_EXTENSIONS = new Set([
    'zip',
    'rar',
    '7z',
    'tar',
    'gz',
    'bz2',
    'xz',
])

function formatFileSize(bytes: number | undefined, tr: Translations): string {
    if (!bytes || bytes === 0) return tr.zeroBytes
    const k = 1024
    const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i] ?? ''}`
}

/**
 * Per-category thumbnail treatment for non-media rows so pdf / archive / audio /
 * generic no longer all read as the same blue doc: a distinct gradient tint plus
 * the type-specific glyph (audio uses the waveform icon; the rest use the
 * file-<ext> registry icon, falling back to the generic file glyph). Mirrors
 * React's FileRow.nonMediaThumb.
 */
function nonMediaThumb(
    type: string,
    name: string,
): { gradient: string; icon: 'audio' | IconName } {
    const ext = fileGetExtension(type, name)
    if (type.startsWith('audio/'))
        return {
            gradient: 'linear-gradient(135deg,#a855f7,#6366f1)',
            icon: 'audio',
        }
    if (ext === 'pdf' || type === 'application/pdf')
        return {
            gradient: 'linear-gradient(135deg,#f43f5e,#ec4899)',
            icon: 'file-pdf',
        }
    if (ARCHIVE_EXTENSIONS.has(ext) || type.includes('zip'))
        return {
            gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
            icon: fileTypeIconName(ext === 'zip' ? 'zip' : ext),
        }
    return {
        gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
        icon: fileTypeIconName(ext),
    }
}

/**
 * Compact list-mode row (spec §4 state 3, states-tour-v2.html "multiple files").
 * A horizontal card: thumbnail · name/size · remove. Mirrors React's FileRow —
 * with no edit affordance (image editor is react/preact-only).
 */
export function fileRow(
    ctx: UploaderContext,
    file: UploadFile,
    index = 0,
): TemplateResult {
    const tr = ctx.translations
    const { isDark } = ctx.theme.getSnapshot()

    const type = file.type ?? ''
    const isImage = fileGetIsImage(type)
    const isVideo = type.startsWith('video/')
    const isSuccessful = file.status === UploadStatus.SUCCESSFUL
    const thumb = nonMediaThumb(type, file.name)

    const m = ctx.orchestrator.getSnapshot().filesProgressMap[file.id]
    const loaded = m?.loaded ?? NaN
    const total = m?.total ?? NaN
    const pctRaw = Math.floor((loaded / total) * 100)
    const progress = Number.isFinite(pctRaw) ? pctRaw : 0

    const onRemove = (e: MouseEvent) => {
        e.stopPropagation()
        ctx.handleFileRemove(file.id)
    }

    return html` <div
        class=${cn(
            'upup-fx-hover-lift upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
            isDark
                ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
                : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
        )}
    >
        <div
            class="upup-relative upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
            style=${
                isImage
                    ? `background-image: url(${file.url ?? ''})`
                    : isVideo
                      ? nothing
                      : `background: ${thumb.gradient}`
            }
        >
            ${
                isVideo
                    ? html`<video
                          src=${file.url ?? ''}
                          muted
                          playsinline
                          preload="metadata"
                          class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
                      ></video>`
                    : nothing
            }
            ${
                !isImage && !isVideo
                    ? icon(thumb.icon, { size: 20, class: 'upup-text-white' })
                    : nothing
            }
        </div>

        <div
            class="upup-flex upup-min-w-0 upup-flex-1 upup-flex-col upup-gap-0.5"
        >
            <div
                class=${cn(
                    'upup-truncate upup-text-[13px]',
                    isDark ? 'upup-text-[#e2e8f0]' : 'upup-text-gray-900',
                )}
            >
                ${file.name}
            </div>
            <div
                class=${cn(
                    'upup-text-[12px]',
                    isDark ? 'upup-text-[#94a3b8]' : 'upup-text-gray-500',
                )}
            >
                ${formatFileSize(file.size, tr)}
            </div>
            ${
                progress
                    ? progressBar(ctx, {
                          progress,
                          class: 'upup-mt-1',
                          progressBarClassName: 'upup-rounded',
                          showValue: true,
                      })
                    : nothing
            }
        </div>

        ${
            isSuccessful
                ? fileSuccessCheck({ index, size: 22, class: 'upup-flex-none' })
                : nothing
        }
        ${
            !isSuccessful
                ? html` <button
                      class=${cn(
                          'upup-fx-remove upup-fx-press upup-flex upup-h-8 upup-w-8 upup-flex-none upup-items-center upup-justify-center upup-rounded-lg',
                          isDark
                              ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
                              : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
                          'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                      )}
                      @click=${onRemove}
                      type="button"
                      ?disabled=${!!progress}
                      aria-label=${tr.removeFile}
                      data-testid="upup-file-remove"
                  >
                      ${icon('trash', { class: 'upup-h-5 upup-w-5' })}
                  </button>`
                : nothing
        }
    </div>`
}
