'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
//   • Resume vs reset: when `active` flips false→true, the clock RESTARTS from
//     t=0 (you see the take from the top) rather than resuming where it froze —
//     deliberate, so a scene scrolled back into view always replays cleanly.
//   • Dev guard: in development a mis-authored script (steps not ascending by
//     `at`, or `loop` not greater than the last step's `at`) console.errors with
//     the offending index/values instead of silently truncating choreography.
//   • `seek(seconds)`: jump the loop clock to `seconds` (the rAF `start` origin
//     is held in a ref, so `seek` rebases it to `performance.now() - s*1000` and
//     the next tick — ≤1 frame away — computes `elapsed = s` and re-merges the
//     phase; no new render path). A no-op while `frozen` (the clock never runs
//     frozen, so there is nothing to jump). Seeking backwards is legal:
//     `mergeUpTo` replays from `initial`, so the merged state is exactly the
//     scripted state at the target time and AnimatePresence plays the same row
//     exits it would on the loop wrap.
//     Authoring rule for callers: only seek to timestamps where NO
//     overlay-internal element is the active cursor/ghost waypoint — i.e. beat
//     starts, where `overlayKind === null` in the merged state. Seeking into a
//     phase whose waypoint lives inside an overlay that mounts on that same
//     render races `scene-targets` measurement (warn + fallback to {0,0}).
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
    /** Optional scene name, used only to label dev-guard diagnostics. */
    name?: string
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
    name,
}: UseSceneTimelineOptions<S>): {
    state: S
    phase: number
    frozen: boolean
    seek: (seconds: number) => void
} {
    const reduceMotion = useReducedMotion()
    const frozen = !!reduceMotion || !active
    // seek reads `frozen` through a ref so its identity stays stable across
    // renders (chips hand it to onClick) yet it always honours the live gate.
    const frozenRef = useRef(frozen)
    frozenRef.current = frozen

    // Read the script/loop through refs so a fresh (non-memoised) array from the
    // scene doesn't restart the clock every render — only `frozen` gates it.
    const stepsRef = useRef(steps)
    stepsRef.current = steps
    const loopRef = useRef(loop)
    loopRef.current = loop

    // Dev-only invariant guard: five scenes are authored against this engine, and
    // a bad `at` ordering / short `loop` truncates choreography silently.
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return
        const label = name ? `useSceneTimeline(${name})` : 'useSceneTimeline'
        for (let i = 1; i < steps.length; i++) {
            if (steps[i].at < steps[i - 1].at) {
                console.error(
                    `${label}: steps must be ascending by \`at\` — step ${i} (at=${steps[i].at}) precedes step ${i - 1} (at=${steps[i - 1].at}); choreography from here on is truncated.`,
                )
            }
        }
        const lastAt = steps.length ? steps[steps.length - 1].at : 0
        if (loop <= lastAt) {
            console.error(
                `${label}: \`loop\` (${loop}s) must be greater than the last step's \`at\` (${lastAt}s), or that step never plays.`,
            )
        }
    }, [steps, loop, name])

    const [phase, setPhase] = useState(steps.length)

    // The rAF clock's origin, held in a ref so `seek` can rebase it without
    // touching the loop (null → the next tick stamps it to `now`, restarting
    // from t=0 when the effect (re)runs on a frozen→live flip).
    const startRef = useRef<number | null>(null)

    useEffect(() => {
        if (frozen) {
            setPhase(stepsRef.current.length)
            return
        }
        startRef.current = null
        let raf = 0
        const tick = (now: number) => {
            if (startRef.current === null) startRef.current = now
            const script = stepsRef.current
            const elapsed = ((now - startRef.current) / 1000) % loopRef.current
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

    // Rebase the clock so the next tick reads `elapsed = seconds` (≤1 frame away)
    // and re-merges the phase. No-op while frozen — the clock isn't running.
    const seek = useCallback((seconds: number) => {
        if (frozenRef.current) return
        startRef.current = performance.now() - seconds * 1000
    }, [])

    const effectivePhase = frozen ? steps.length : phase
    const state = mergeUpTo(initial, steps, effectivePhase)

    return { state, phase: effectivePhase, frozen, seek }
}
