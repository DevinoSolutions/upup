import { html } from 'lit-html'
import { cn } from '../lib/cn'
import { fileTypeIconName } from '@upup/core'
import type { UploaderContext } from '../lib/types'
import { icon } from './icon'

export function fileIcon(ctx: UploaderContext, extension = '', className = '') {
  const isDark = ctx.theme.getSnapshot().isDark
  const iconClass = cn('upup-text-5xl upup-text-blue-600', className, { 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': isDark })
  return html`
    <span class="upup-inline-flex" data-testid="upup-file-icon" data-upup-slot="file-icon">
      ${icon(fileTypeIconName(extension), { class: iconClass })}
    </span>`
}
