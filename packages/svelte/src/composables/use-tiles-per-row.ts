import { onDestroy } from 'svelte'
import { writable, type Readable } from 'svelte/store'
import { computeTilesPerRow } from '../lib/view-mode'

export interface UseTilesPerRowReturn {
    /** Reactive tile-per-row count for the currently observed element (0 until
     *  measured — see view-mode.ts). */
    tilesPerRow: Readable<number>
    /** (Re)observe an element with the ResizeObserver. Call it whenever the
     *  scroll container the file list binds changes (it mounts after the list
     *  first renders); passing null disconnects. */
    observe: (el: HTMLElement | null) => void
}

/**
 * Measure an element's content-box width with a ResizeObserver and derive how
 * many 160px grid tiles fit one row (see view-mode.ts). Returns 0 until measured
 * (SSR / jsdom / pre-paint), which isListViewForced reads as "unknown — don't
 * force list yet". Isolated in its own module so tests can mock the measurement
 * seam without a real layout engine. Mirrors React's lib/use-tiles-per-row.
 */
export function useTilesPerRow(): UseTilesPerRowReturn {
    const tilesPerRow = writable(0)
    let ro: ResizeObserver | null = null

    function observe(el: HTMLElement | null) {
        ro?.disconnect()
        ro = null
        if (!el || typeof ResizeObserver === 'undefined') return
        ro = new ResizeObserver(entries => {
            const next = entries[0]?.contentRect.width ?? 0
            tilesPerRow.set(computeTilesPerRow(next))
        })
        ro.observe(el)
    }

    onDestroy(() => {
        ro?.disconnect()
        ro = null
    })

    return { tilesPerRow: { subscribe: tilesPerRow.subscribe }, observe }
}
