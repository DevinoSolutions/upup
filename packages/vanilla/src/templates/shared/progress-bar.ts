import { html, nothing } from 'lit-html'
import { isUploadActive, cn } from '@upup/core'
import type { RootContext } from '../../lib/types'

export function progressBar(
  ctx: RootContext,
  opts: { progress: number; showValue?: boolean; progressBarClassName?: string; class?: string },
) {
  const { progress, showValue = false, progressBarClassName = '', class: className = '' } = opts
  const isDark = ctx.theme.getSnapshot().isDark
  const slot = ctx.theme.getSnapshot().slotOverrides
  const themeSlots = ctx.theme.getSnapshot().slots
  const tr = ctx.translations
  const uploadStatus = ctx.orchestrator.getSnapshot().uploadStatus
  if (!(!!progress || isUploadActive(uploadStatus))) return nothing
  return html`
    <div
      data-testid="upup-progress-bar" data-upup-slot="progress-bar" role="progressbar"
      aria-valuenow=${progress} aria-valuemin="0" aria-valuemax="100" aria-label=${tr.uploadProgress}
      class=${cn('upup-flex upup-items-center upup-gap-2', className, slot.progressBarContainer, themeSlots?.progressBar?.root)}
    >
      <div class=${cn('upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px] upup-bg-[#F5F5F5]', progressBarClassName, slot.progressBar, themeSlots?.progressBar?.track)}>
        <div style=${`width: ${progress}%`} class=${cn('upup-h-full upup-bg-[#8EA5E7]', slot.progressBarInner, themeSlots?.progressBar?.fill)}></div>
      </div>
      ${showValue ? html`<p class=${cn('upup-text-xs upup-font-semibold', { 'upup-text-white': isDark }, slot.progressBarText, themeSlots?.progressBar?.text)}>${progress}%</p>` : nothing}
    </div>`
}
