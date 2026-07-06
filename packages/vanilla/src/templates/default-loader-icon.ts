import type { TemplateResult } from 'lit-html'
import { icon } from './icon'
export function defaultLoaderIcon(): TemplateResult {
    return icon('loader', {
        class: 'upup-animate-spin upup-text-3xl upup-text-[#6D6D6D]',
    })
}
