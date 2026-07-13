import { html, type TemplateResult } from 'lit-html'
import { cn, b64EncodeUnicode } from '@upupjs/core/internal'
import type { DriveFile } from '@upupjs/core'
import type { UploaderContext } from '../../lib/types'
import { icon } from '../icon'

function handleImgError(e: Event) {
    const img = e.target as HTMLImageElement
    const svg = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path></svg>`
    img.src = `data:image/svg+xml;base64,${b64EncodeUnicode(svg)}`
    img.onerror = null
}

export function driveBrowserIcon(
    ctx: UploaderContext,
    args: { isFolder: boolean; file: DriveFile },
): TemplateResult {
    const { isFolder, file } = args
    const isDark = ctx.theme.getSnapshot().isDark

    if (isFolder) {
        return html` <i class="upup-flex-grow upup-text-lg">
            ${icon('folder', {
                class: cn({
                    'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]': isDark,
                }),
            })}
        </i>`
    }

    if (!file.thumbnail) {
        return html` <i class="upup-flex-grow upup-text-lg">
            ${icon('file', {
                class: cn({
                    'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]': isDark,
                }),
            })}
        </i>`
    }

    return html` <img
        src=${file.thumbnail}
        alt=${file.name}
        class="upup-h-5 upup-w-5 upup-flex-grow upup-rounded-md upup-shadow"
        @error=${handleImgError}
    />`
}
