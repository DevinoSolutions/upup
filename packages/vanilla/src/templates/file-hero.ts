import { html, nothing, type TemplateResult } from 'lit-html'
import { UploadStatus, type UploadFile, type Translations } from '@upupjs/core'
import { fileGetExtension, fileGetIsImage, cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { fileIcon } from './file-icon'
import { progressBar } from './shared/progress-bar'
import { fileSuccessCheck } from './shared/file-success-check'
import { icon } from './icon'

function formatFileSize(bytes: number | undefined, tr: Translations): string {
    if (!bytes || bytes === 0) return tr.zeroBytes
    const k = 1024
    const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i] ?? ''}`
}

/**
 * Single-file HERO preview (spec §4 state 3, states-tour-v2.html "single file").
 * One visual fills the fixed-height content area with a bottom scrim caption.
 * The panel is fixed-height by ruling, so the media MUST stay bounded with
 * `min-h-0 flex-1 object-contain`. Mirrors React's FileHero — with no edit
 * affordance (image editor is react/preact-only).
 */
export function fileHero(
    ctx: UploaderContext,
    file: UploadFile,
): TemplateResult {
    const tr = ctx.translations
    const { isDark } = ctx.theme.getSnapshot()

    const isImage = fileGetIsImage(file.type ?? '')
    const isVideo = (file.type ?? '').startsWith('video/')
    const extension = fileGetExtension(file.type ?? '', file.name)

    const m = ctx.orchestrator.getSnapshot().filesProgressMap[file.id]
    const loaded = m?.loaded ?? NaN
    const total = m?.total ?? NaN
    const pctRaw = Math.floor((loaded / total) * 100)
    const progress = Number.isFinite(pctRaw) ? pctRaw : 0

    const isSuccessful = file.status === UploadStatus.SUCCESSFUL

    const onRemove = (e: MouseEvent) => {
        e.stopPropagation()
        ctx.handleFileRemove(file.id)
    }

    return html` <div
        data-testid="upup-file-hero"
        data-upup-slot="file-hero"
        role="listitem"
        class=${cn(
            'upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1',
            isDark
                ? 'upup-bg-white/[0.03] upup-ring-white/[0.08]'
                : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
        )}
    >
        ${
            isImage
                ? html`<img
                      src=${file.url ?? ''}
                      alt=${file.name}
                      class="upup-min-h-0 upup-flex-1 upup-object-contain"
                  />`
                : isVideo
                  ? html`<video
                        src=${file.url ?? ''}
                        muted
                        playsinline
                        preload="metadata"
                        class="upup-pointer-events-none upup-min-h-0 upup-flex-1 upup-object-contain"
                    ></video>`
                  : html`<div
                        class="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-bg-gradient-to-br upup-from-[#0ea5e9]/10 upup-to-[#7c3aed]/10"
                    >
                        ${fileIcon(ctx, extension)}
                    </div>`
        }
        ${
            isSuccessful
                ? fileSuccessCheck({
                      class: 'upup-absolute upup-left-3 upup-top-3 upup-z-10',
                  })
                : nothing
        }
        ${
            !isSuccessful
                ? html` <button
                      class=${cn(
                          'upup-fx-remove upup-fx-press upup-absolute upup-right-3 upup-top-3 upup-z-10',
                          'upup-flex upup-h-[34px] upup-w-[34px] upup-items-center upup-justify-center',
                          'upup-rounded-[9px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                          'hover:upup-bg-[#04080f]/65',
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

        <div
            class=${cn(
                'upup-pointer-events-none upup-absolute upup-inset-x-0 upup-bottom-0 upup-bg-gradient-to-t upup-to-transparent upup-px-[18px] upup-pb-3.5 upup-pt-4',
                isDark
                    ? 'upup-from-[#04080f]/[0.86] upup-via-[#04080f]/50'
                    : 'upup-from-white/[0.92] upup-via-white/60',
            )}
        >
            <div
                class=${cn(
                    'upup-truncate upup-text-[13px] upup-font-semibold',
                    isDark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#1e293b]',
                )}
            >
                ${file.name}
            </div>
            <div
                class=${cn(
                    'upup-mt-0.5 upup-text-[12px]',
                    isDark ? 'upup-text-[#94a3b8]' : 'upup-text-[#64748b]',
                )}
            >
                ${formatFileSize(file.size, tr)}
            </div>
            ${progressBar(ctx, {
                progress,
                class: cn(
                    'upup-mt-2',
                    isDark ? 'upup-text-white' : 'upup-text-[#0f172a]',
                ),
                progressBarClassName: 'upup-rounded',
                showValue: true,
            })}
        </div>
    </div>`
}
