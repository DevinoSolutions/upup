import { RefObject, useEffect, useState } from 'react'
import { computeTilesPerRow } from './view-mode'

/**
 * Measure `ref`'s content-box width with a ResizeObserver and derive how many
 * 145px grid tiles fit one row (see view-mode.ts). Returns 0 until measured
 * (SSR / jsdom / pre-paint), which isListViewForced reads as "unknown — don't
 * force list yet". Isolated in its own module so tests can mock the measurement
 * seam without a real layout engine.
 */
export function useTilesPerRow(ref: RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0)
    useEffect(() => {
        const el = ref.current
        if (!el || typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(entries => {
            const next = entries[0]?.contentRect.width ?? 0
            setWidth(prev => (prev === next ? prev : next))
        })
        ro.observe(el)
        return () => {
            ro.disconnect()
        }
    }, [ref])
    return computeTilesPerRow(width)
}
