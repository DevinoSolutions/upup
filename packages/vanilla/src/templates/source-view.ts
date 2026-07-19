import { html, nothing, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { cn } from '../lib/cn'
import type { UploaderContext } from '../lib/types'
import { uploadSourceObject } from '../lib/constants'
import { setHeaderExtraHost } from '../context/source-view-header-extra'

// Stable per-ctx ref callback for the header-extra host so lit-html invokes it
// only on real mount/unmount (no per-render churn).
const hostRefCbs = new WeakMap<
    UploaderContext,
    (el: Element | undefined) => void
>()
function getHostRefCb(ctx: UploaderContext): (el: Element | undefined) => void {
    let cb = hostRefCbs.get(ctx)
    if (!cb) {
        cb = (el: Element | undefined) => {
            setHeaderExtraHost(ctx, (el as HTMLElement | undefined) ?? null)
        }
        hostRefCbs.set(ctx, cb)
    }
    return cb
}

export function sourceView(
    ctx: UploaderContext,
): TemplateResult | typeof nothing {
    const active = ctx.orchestrator.getSnapshot().activeSource
    const entry = active ? uploadSourceObject[active] : undefined
    const View = entry?.View
    const Icon = entry?.Icon
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations
    const shouldShow =
        !!View && !ctx.props.mini && !!active && !!Icon && !!entry
    if (!shouldShow || !entry || !View || !Icon || !active) return nothing

    const handleCancel = () => {
        ctx.core.emit('source-view-cancel', { sourceId: active })
        ctx.setActiveSource(undefined)
    }
    return html`
        <div
            class="upup-animate-fx-view upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
            data-upup-slot="source-view"
        >
            <div
                class=${cn(
                    'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-px-3 upup-py-2 upup-text-sm upup-font-medium',
                    isDark ? 'upup-text-[#FAFAFA]' : 'upup-text-[#0f172a]',
                    slot.sourceViewHeader,
                )}
            >
                <span class="upup-flex upup-items-center upup-gap-2">
                    ${Icon()}
                    <span>${tr[entry.nameKey]}</span>
                </span>
                <span class="upup-flex upup-items-center upup-gap-2.5">
                    <span
                        ${ref(getHostRefCb(ctx))}
                        data-upup-slot="source-view-header-extra"
                        class="upup-flex upup-items-center upup-gap-2.5 empty:upup-hidden"
                    ></span>
                    <button
                        class=${cn(
                            'upup-rounded-md upup-p-1 upup-text-[#0284c7] upup-transition-all upup-duration-300',
                            {
                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                    isDark,
                            },
                            slot.sourceViewCancelButton,
                        )}
                        @click=${handleCancel}
                        type="button"
                    >
                        ${tr.overlayBack}
                    </button>
                </span>
            </div>
            ${View(ctx)}
        </div>
    `
}
