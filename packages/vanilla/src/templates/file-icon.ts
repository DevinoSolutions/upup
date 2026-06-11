import { html, nothing } from 'lit-html'
import { cn } from '../lib/cn'
import type { RootContext } from '../lib/types'
import { FileIconSvg } from './icons'

export function fileIcon(ctx: RootContext, extension = '', className = '') {
  const isDark = ctx.theme.getSnapshot().isDark
  const iconClass = cn('upup-text-5xl upup-text-blue-600', className, { 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': isDark })
  return html`
    <div class="upup-flex upup-flex-col upup-items-center upup-gap-0.5">
      ${FileIconSvg({ class: iconClass })}
      ${extension ? html`<span class="upup-text-[10px] upup-font-medium upup-uppercase upup-text-gray-500">${extension}</span>` : nothing}
    </div>`
}
