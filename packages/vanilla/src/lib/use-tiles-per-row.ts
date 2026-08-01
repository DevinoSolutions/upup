import { computeTilesPerRow } from './view-mode'
import type { UploaderContext } from './types'

/**
 * Per-context tiles-per-row measurement. Mirrors React's lib/use-tiles-per-row,
 * adapted to vanilla's imperative render loop: a ResizeObserver watches the file
 * list's scroll container and derives how many 160px grid tiles fit one row (see
 * view-mode.ts). Returns 0 until measured (SSR / jsdom / pre-paint), which
 * isListViewForced reads as "unknown — don't force list yet".
 *
 * State is keyed by UploaderContext in WeakMaps so it is per-uploader and
 * garbage-collected with the context. `observeTiles` is idempotent for a stable
 * element (only re-attaches when the observed element changes); a measurement
 * change calls ctx.invalidate() so the next render re-reads getTilesPerRow.
 */
interface TilesEntry {
    ro: ResizeObserver
    el: HTMLElement
    tiles: number
}
const entries = new WeakMap<UploaderContext, TilesEntry>()

export function getTilesPerRow(ctx: UploaderContext): number {
    return entries.get(ctx)?.tiles ?? 0
}

export function observeTiles(
    ctx: UploaderContext,
    el: HTMLElement | null,
): void {
    const prev = entries.get(ctx)
    if (!el) {
        if (prev) {
            prev.ro.disconnect()
            entries.delete(ctx)
        }
        return
    }
    if (prev && prev.el === el) return
    prev?.ro.disconnect()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(observed => {
        const next = observed[0]?.contentRect.width ?? 0
        const tiles = computeTilesPerRow(next)
        const entry = entries.get(ctx)
        if (!entry) return
        if (entry.tiles === tiles) return
        entry.tiles = tiles
        ctx.invalidate()
    })
    ro.observe(el)
    entries.set(ctx, { ro, el, tiles: 0 })
}

export function destroyTiles(ctx: UploaderContext): void {
    const entry = entries.get(ctx)
    if (entry) {
        entry.ro.disconnect()
        entries.delete(ctx)
    }
}
