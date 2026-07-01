import { html } from 'lit-html'
import type { TemplateResult } from 'lit-html'
import { cn } from '../../lib/cn'
import type { RootContext } from '../../lib/types'

export function sourceViewContainer(
  ctx: RootContext,
  opts: { isLoading?: boolean; dataUpupSlot?: string; dataTestid?: string },
  children: TemplateResult,
) {
  const isLoading = opts.isLoading ?? false
  const isDark = ctx.theme.getSnapshot().isDark
  const slot = ctx.theme.getSnapshot().slotOverrides
  return html`
    <div
      data-testid=${opts.dataTestid ?? 'upup-adapter-view'}
      data-upup-slot=${opts.dataUpupSlot ?? ''}
      class=${cn('upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]', {
        'upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]': isLoading && isDark,
        [slot.sourceView ?? '']: !isLoading && !!slot.sourceView,
        [slot.driveLoading ?? '']: isLoading && !!slot.driveLoading,
      })}
    >${children}</div>`
}
