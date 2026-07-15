'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// useSceneTimeline — the ONE engine every UploaderScene declares a script
// against. A scene provides an `initial` state and an ascending list of `steps`
// (`{ at: seconds, set: Partial<State> }`). The engine advances a loop clock and
// re-renders ONLY when a step boundary is crossed, exposing the merged state at
// that phase. Framer-motion then springs/tweens between the discrete targets —
// so a ~dozen setStates per loop drive smooth motion (no per-frame renders).
//
// Central behaviours (so scenes never re-implement them):
//   • `active === false` (viewport gating) OR prefers-reduced-motion → the clock
//     never runs; the state is frozen at the FINAL frame (all steps applied).
//   • On unmount the rAF loop is cancelled.
//   • Loop restart: when the clock wraps past `loop`, phase returns to 0 and the
//     state springs back to `initial` — the "clear the panel for the next take"
//     reset beat. Give the last step a restful state and leave head-room in
//     `loop` for the pause.
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelineStep<S> {
    /** Seconds into the loop at which this step's `set` becomes active. */
    at: number
    /** Partial state merged in (shallow) once the clock passes `at`. */
    set: Partial<S>
}

interface UseSceneTimelineOptions<S> {
    initial: S
    /** Ascending by `at`. Later steps shallow-override earlier ones. */
    steps: TimelineStep<S>[]
    /** Total loop length in seconds, including any trailing rest beat. */
    loop: number
    /** Viewport gate: when false the timeline holds the final frame. */
    active?: boolean
}

function mergeUpTo<S extends object>(
    initial: S,
    steps: TimelineStep<S>[],
    count: number,
): S {
    let state = { ...initial }
    for (let i = 0; i < count; i++) {
        state = { ...state, ...steps[i].set }
    }
    return state
}

export function useSceneTimeline<S extends object>({
    initial,
    steps,
    loop,
    active = true,
}: UseSceneTimelineOptions<S>): { state: S; phase: number; frozen: boolean } {
    const reduceMotion = useReducedMotion()
    const frozen = !!reduceMotion || !active

    // Read the script/loop through refs so a fresh (non-memoised) array from the
    // scene doesn't restart the clock every render — only `frozen` gates it.
    const stepsRef = useRef(steps)
    stepsRef.current = steps
    const loopRef = useRef(loop)
    loopRef.current = loop

    const [phase, setPhase] = useState(steps.length)

    useEffect(() => {
        if (frozen) {
            setPhase(stepsRef.current.length)
            return
        }
        let raf = 0
        let start: number | null = null
        const tick = (now: number) => {
            if (start === null) start = now
            const script = stepsRef.current
            const elapsed = ((now - start) / 1000) % loopRef.current
            let count = 0
            while (count < script.length && script[count].at <= elapsed) {
                count++
            }
            setPhase(prev => (prev === count ? prev : count))
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [frozen])

    const effectivePhase = frozen ? steps.length : phase
    const state = mergeUpTo(initial, steps, effectivePhase)

    return { state, phase: effectivePhase, frozen }
}

// ─────────────────────────────────────────────────────────────────────────────
// useElementSize — measures a box so the cursor can be positioned by percentage
// yet animated with transforms only (never top/left in the loop). The scene maps
// percent coords → pixels via the measured size and feeds SceneCursor `x`/`y`.
// ─────────────────────────────────────────────────────────────────────────────

export function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect
            if (rect) setSize({ width: rect.width, height: rect.height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return [ref, size] as const
}
