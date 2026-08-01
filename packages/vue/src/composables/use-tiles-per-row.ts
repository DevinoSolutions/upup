import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { computeTilesPerRow } from '../lib/view-mode'

/**
 * Measure `elRef`'s content-box width with a ResizeObserver and derive how many
 * 160px grid tiles fit one row (see view-mode.ts). Returns 0 until measured
 * (SSR / jsdom / pre-paint), which isListViewForced reads as "unknown — don't
 * force list yet". Isolated in its own module so tests can mock the measurement
 * seam without a real layout engine. Mirrors React's lib/use-tiles-per-row.
 */
export function useTilesPerRow(elRef: Ref<HTMLElement | null>): Ref<number> {
    const tilesPerRow = ref(0)
    let ro: ResizeObserver | null = null

    function observe(el: HTMLElement | null) {
        ro?.disconnect()
        ro = null
        if (!el || typeof ResizeObserver === 'undefined') return
        ro = new ResizeObserver(entries => {
            const next = entries[0]?.contentRect.width ?? 0
            tilesPerRow.value = computeTilesPerRow(next)
        })
        ro.observe(el)
    }

    onMounted(() => {
        observe(elRef.value)
    })
    // The scroll container is created once the file list renders; re-observe if
    // the element the ref points at changes.
    watch(elRef, el => {
        observe(el)
    })
    onUnmounted(() => {
        ro?.disconnect()
        ro = null
    })

    return tilesPerRow
}
