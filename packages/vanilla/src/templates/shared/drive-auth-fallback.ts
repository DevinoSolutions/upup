import { html, nothing } from 'lit-html'
import { formatUiMessage as t, cn } from '@upup/core'
import type { DriveBrowserError } from '@upup/core'
import type { UploaderContext } from '../../lib/types'
import { sourceViewContainer } from './source-view-container'

export function driveAuthFallback(
  ctx: UploaderContext,
  opts: {
    providerName: string
    onRetry: () => void
    error?: DriveBrowserError
    dataUpupSlot?: string
  },
) {
  const isDark = ctx.theme.getSnapshot().isDark
  const tr = ctx.translations
  // NOTE: the `sourceView` slot class is applied by sourceViewContainer's wrapper
  // (matching svelte DriveAuthFallback), so it is intentionally NOT re-applied here.
  const inner = html`
    <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center">
      ${opts.error ? html`
        <p
          data-testid="upup-drive-error"
          data-upup-slot="drive-error"
          role="alert"
          class="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
        >${t(tr.driveLoadError, { message: opts.error.message })}</p>` : nothing}
      <p class=${cn('upup-text-sm upup-text-[#333]', { 'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': isDark })}>${t(tr.authenticatePrompt, { provider: opts.providerName })}</p>
      <button type="button" class=${cn('upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700', { 'upup-bg-[#30C5F7] hover:upup-bg-[#1eb4e6] dark:upup-bg-[#30C5F7] dark:hover:upup-bg-[#1eb4e6]': isDark })} @click=${opts.onRetry}>${t(tr.signInWith, { provider: opts.providerName })}</button>
    </div>`
  return sourceViewContainer(ctx, { dataUpupSlot: opts.dataUpupSlot ?? 'drive-auth-fallback' }, inner)
}
