import { signal, type Signal } from '@angular/core'
import { computeTilesPerRow } from './view-mode'

/**
 * Measure an element's content-box width with a ResizeObserver and derive how
 * many 160px grid tiles fit one row (see view-mode.ts). Returns 0 until measured
 * (SSR / jsdom / pre-paint), which isListViewForced reads as "unknown — don't
 * force list yet". Isolated so tests can mock the measurement seam without a
 * real layout engine. Mirrors React's lib/use-tiles-per-row.
 */
export class TilesPerRowObserver {
    private ro: ResizeObserver | null = null
    private readonly _tilesPerRow = signal(0)

    /** Reactive tile-per-row count (0 until measured — see view-mode.ts). */
    get tilesPerRow(): Signal<number> {
        return this._tilesPerRow.asReadonly()
    }

    /** (Re)observe an element with the ResizeObserver. Call it whenever the
     *  scroll container the file list binds changes; passing null disconnects. */
    observe(el: HTMLElement | null): void {
        this.ro?.disconnect()
        this.ro = null
        if (!el || typeof ResizeObserver === 'undefined') return
        this.ro = new ResizeObserver(entries => {
            const next = entries[0]?.contentRect.width ?? 0
            this._tilesPerRow.set(computeTilesPerRow(next))
        })
        this.ro.observe(el)
    }

    destroy(): void {
        this.ro?.disconnect()
        this.ro = null
    }
}
