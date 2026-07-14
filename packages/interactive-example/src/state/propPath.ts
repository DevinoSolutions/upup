import type { VisibleWhen } from '../types'

/**
 * Walk a dotted path through a config-like object. Used for both the
 * cloud-drive credential gating in MultiSelect and the visibleWhen
 * dependency check in CategorySection / NestedConfig.
 */
export function readPath(obj: unknown, path: string): unknown {
    let cur: any = obj
    for (const k of path.split('.')) {
        if (cur == null) return undefined
        cur = cur[k]
    }
    return cur
}

export function isVisible(visibleWhen: VisibleWhen | undefined, config: unknown): boolean {
    if (!visibleWhen) return true
    const cur = readPath(config, visibleWhen.propId)
    if (visibleWhen.equals !== undefined) {
        const expected = Array.isArray(visibleWhen.equals) ? visibleWhen.equals : [visibleWhen.equals]
        return expected.some((v) => v === cur)
    }
    if (visibleWhen.notEquals !== undefined) {
        return cur !== visibleWhen.notEquals
    }
    return true
}
