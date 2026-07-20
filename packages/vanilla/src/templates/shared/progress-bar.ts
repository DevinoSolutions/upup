import { html, nothing, type TemplateResult } from 'lit-html'
import { isUploadActive, cn } from '@upupjs/core/internal'
import type { UploaderContext } from '../../lib/types'

export function progressBar(
    ctx: UploaderContext,
    opts: {
        progress: number
        showValue?: boolean
        progressBarClassName?: string
        class?: string
    },
): TemplateResult | typeof nothing {
    const {
        progress,
        showValue = false,
        progressBarClassName = '',
        class: className = '',
    } = opts
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const themeSlots = ctx.theme.getSnapshot().slots
    const tr = ctx.translations
    const uploadStatus = ctx.orchestrator.getSnapshot().uploadStatus
    if (!(!!progress || isUploadActive(uploadStatus))) return nothing
    return html` <div
        data-testid="upup-progress-bar"
        data-upup-slot="progress-bar"
        role="progressbar"
        aria-valuenow=${progress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label=${tr.uploadProgress}
        class=${cn(
            'upup-flex upup-items-center upup-gap-2',
            className,
            slot.progressBarContainer,
            themeSlots.progressBar?.root,
        )}
    >
        <div
            class=${cn(
                'upup-relative upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
                isDark ? 'upup-bg-white/[0.12]' : 'upup-bg-[#F5F5F5]',
                progressBarClassName,
                slot.progressBar,
                themeSlots.progressBar?.track,
            )}
        >
            <div
                style=${`width: ${progress}%`}
                class=${cn(
                    'upup-fx-progress-fill upup-fx-essential upup-h-full',
                    isDark ? 'upup-bg-[#38bdf8]' : 'upup-bg-[#0ea5e9]',
                    slot.progressBarInner,
                    themeSlots.progressBar?.fill,
                )}
            ></div>
            ${
                isUploadActive(uploadStatus)
                    ? html`<div
                          aria-hidden="true"
                          class="upup-animate-fx-sheen upup-pointer-events-none upup-absolute upup-inset-y-0 upup-left-0 upup-w-2/5"
                          style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)"
                      ></div>`
                    : nothing
            }
        </div>
        ${
            showValue
                ? html`<p
                      class=${cn(
                          'upup-text-xs upup-font-semibold',
                          { 'upup-text-white': isDark },
                          slot.progressBarText,
                          themeSlots.progressBar?.text,
                      )}
                  >
                      ${progress}%
                  </p>`
                : nothing
        }
    </div>`
}
