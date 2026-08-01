import { html } from 'lit-html'
import type { TemplateResult } from 'lit-html'
import { cn } from '../../lib/cn'
import type { UploaderContext } from '../../lib/types'

export function sourceViewContainer(
    ctx: UploaderContext,
    opts: { isLoading?: boolean; dataUpupSlot?: string; dataTestid?: string },
    children: TemplateResult,
): TemplateResult {
    const isLoading = opts.isLoading ?? false
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    return html` <div
        data-testid=${opts.dataTestid ?? 'upup-source-view'}
        data-upup-slot=${opts.dataUpupSlot ?? ''}
        class=${cn(
            // Transparent by design: the view body sits directly on the panel's
            // gradient chrome (the old black/[0.075] wash read as a mismatched
            // gray block over the light gradient).
            'upup-flex upup-items-center upup-justify-center upup-overflow-hidden',
            {
                'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
                    isLoading && isDark,
                [slot.sourceView ?? '']: !isLoading && !!slot.sourceView,
                [slot.driveLoading ?? '']: isLoading && !!slot.driveLoading,
            },
        )}
    >
        ${children}
    </div>`
}
