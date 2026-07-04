import { html, nothing } from 'lit-html'
import { unsafeSVG } from 'lit-html/directives/unsafe-svg.js'
import { ICONS, type IconName } from '@upup/core'
import { cn } from '../lib/cn'

export function icon(name: IconName, opts?: { size?: number; class?: string }) {
    const def = ICONS[name]
    const px = opts?.size ?? def.defaultSize
    const attrs = def.attrs ?? {}
    return html`<svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox=${def.viewBox}
        width=${px}
        height=${px}
        fill=${attrs.fill ?? nothing}
        stroke=${attrs.stroke ?? nothing}
        stroke-width=${attrs['stroke-width'] ?? nothing}
        stroke-linecap=${attrs['stroke-linecap'] ?? nothing}
        stroke-linejoin=${attrs['stroke-linejoin'] ?? nothing}
        fill-rule=${attrs['fill-rule'] ?? nothing}
        class=${cn(def.className, opts?.class)}
    >
        ${unsafeSVG(def.inner)}
    </svg>`
}
