'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// scene-targets — the ONE cursor-positioning helper every cursor-driven scene
// uses. Mock interactive elements tag themselves with `data-scene-target="<id>"`;
// a scene declares cursor waypoints as those ids (plus an optional fractional
// anchor inside the target) instead of hardcoded percent→pixel coords that drift
// from where the mock actually renders its buttons. `useSceneTargets` measures a
// waypoint against REAL DOMRects relative to the scene root and re-measures on
// resize (ResizeObserver) and on every step-boundary re-render (the scene calls
// `measure` in render with the current waypoint). Off-panel rests/glide-outs may
// still be expressed as a raw percent point — those never track an element.
// ─────────────────────────────────────────────────────────────────────────────

export interface TargetAnchor {
    /** `data-scene-target` id of the element to point at. */
    target: string
    /** Fractional anchor within the target rect (0–1). Default is its centre. */
    ax?: number
    ay?: number
}

export interface PointAnchor {
    /** Percent of the scene root (0–100) — for off-panel rests / glide-outs. */
    px: number
    py: number
}

/** A cursor destination: a measured element, or a raw percent point. */
export type CursorWaypoint = TargetAnchor | PointAnchor

export interface ScenePoint {
    x: number
    y: number
}

function isTarget(wp: CursorWaypoint): wp is TargetAnchor {
    return (wp as TargetAnchor).target !== undefined
}

export function useSceneTargets<T extends HTMLElement>() {
    const rootRef = useRef<T>(null)
    // Bumped by the ResizeObserver so a resized panel re-measures its targets.
    const [, setTick] = useState(0)

    useEffect(() => {
        const el = rootRef.current
        if (!el) return
        // ResizeObserver fires once on observe → the first real measurement
        // lands right after mount (rootRef is null on the initial render).
        const observer = new ResizeObserver(() => setTick(t => t + 1))
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    // Called in render with the current waypoint; reads the live (last-committed)
    // layout. Panel targets are layout-stable, so springing between measured
    // points stays smooth — time a waypoint for AFTER any overlay has settled.
    const measure = useCallback((wp: CursorWaypoint): ScenePoint => {
        const root = rootRef.current
        if (!root) return { x: 0, y: 0 }
        const rootRect = root.getBoundingClientRect()
        if (!isTarget(wp)) {
            return {
                x: (wp.px / 100) * rootRect.width,
                y: (wp.py / 100) * rootRect.height,
            }
        }
        const el = root.querySelector<HTMLElement>(
            `[data-scene-target="${wp.target}"]`,
        )
        if (!el) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(
                    `[scene-targets] no element found for data-scene-target="${wp.target}" — cursor falling back to {0,0}`,
                )
            }
            return { x: 0, y: 0 }
        }
        const r = el.getBoundingClientRect()
        const ax = wp.ax ?? 0.5
        const ay = wp.ay ?? 0.5
        return {
            x: r.left - rootRect.left + r.width * ax,
            y: r.top - rootRect.top + r.height * ay,
        }
    }, [])

    return { rootRef, measure }
}
