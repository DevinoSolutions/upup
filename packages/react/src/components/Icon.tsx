import { createElement } from 'react'
import { ICONS, cn, type IconName } from '@upup/core'

export interface IconProps {
    name: IconName
    size?: number
    className?: string
}

// React uses camelCase SVG prop names; the registry stores kebab-case (raw-SVG) keys.
// Mapping the OUTER-svg attrs avoids React's "Invalid DOM property" dev warnings.
// (def.inner is injected raw via dangerouslySetInnerHTML and is NOT processed by React,
//  so kebab attrs inside it are fine.)
const REACT_ATTR_MAP: Record<string, string> = {
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'fill-rule': 'fillRule',
}
function toReactAttrs(attrs?: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(attrs ?? {}))
        out[REACT_ATTR_MAP[k] ?? k] = v
    return out
}

export function Icon({ name, size, className }: IconProps) {
    const def = ICONS[name]
    const px = size ?? def.defaultSize
    return createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: def.viewBox,
        width: px,
        height: px,
        ...toReactAttrs(def.attrs),
        className: cn(def.className, className),
        dangerouslySetInnerHTML: { __html: def.inner },
    })
}

export default Icon
