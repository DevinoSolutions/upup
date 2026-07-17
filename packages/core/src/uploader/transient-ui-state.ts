import type { ObservableController } from '../controllers/types'
import type { MotionMode } from './motion-gate'

export interface TransientUiSnapshot {
    /** File ids currently playing their exit animation (render upup-fx-exit). */
    leavingFileIds: ReadonlySet<string>
    /** Add-more overlay: source view mounted above the dimmed file list. */
    sourceOverlayOpen: boolean
    /** Provider whose read-only picker just rejected an OS drop (drives the toast). */
    dropRejected: string | null
}

export interface TransientUiParams {
    /** Read fresh each call — the motion gate's current snapshot. */
    motion: () => MotionMode
    /** The REAL removal (orchestrator path). Called exactly once per id. */
    reallyRemove: (fileId: string) => void
    /** Exit-animation duration. Keep in lockstep with --upup-fx-base. */
    exitMs?: number
    /** Drop-rejection toast lifetime. */
    toastMs?: number
}

export interface TransientUiState extends ObservableController<TransientUiSnapshot> {
    removeFileAnimated(fileId: string): void
    openSourceOverlay(): void
    closeSourceOverlay(): void
    flagDropRejected(provider: string): void
}

/**
 * The uploader's transient UI state: deferred file removal (marks a file
 * `leaving` so the exit animation can play before the real removal fires),
 * the add-more source overlay flag, and the drop-rejection toast flag. It is a
 * plain observable so frameworks can drive it through `useSyncExternalStore`.
 * All removals go through `reallyRemove` exactly once; when motion is `off`
 * the deferral collapses to an immediate call so reduced-motion users never
 * wait on an animation that will not run.
 */
export function createTransientUiState({
    motion,
    reallyRemove,
    exitMs = 200,
    toastMs = 3000,
}: TransientUiParams): TransientUiState {
    const listeners = new Set<() => void>()
    const leaving = new Set<string>()
    const timers = new Set<ReturnType<typeof setTimeout>>()
    let overlayOpen = false
    let rejected: string | null = null
    let toastGen = 0
    let destroyed = false

    function compute(): TransientUiSnapshot {
        return {
            leavingFileIds: new Set(leaving),
            sourceOverlayOpen: overlayOpen,
            dropRejected: rejected,
        }
    }

    let snapshot: TransientUiSnapshot = compute()

    function notify() {
        snapshot = compute()
        listeners.forEach(l => {
            l()
        })
    }

    function later(ms: number, fn: () => void) {
        const t = setTimeout(() => {
            timers.delete(t)
            if (!destroyed) fn()
        }, ms)
        timers.add(t)
    }

    return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        removeFileAnimated(fileId) {
            if (leaving.has(fileId)) return
            if (motion() === 'off') {
                // instant path: no self-notify — reallyRemove's own change event drives render
                reallyRemove(fileId)
                return
            }
            leaving.add(fileId)
            notify()
            later(exitMs, () => {
                leaving.delete(fileId)
                reallyRemove(fileId)
                notify()
            })
        },
        openSourceOverlay() {
            if (overlayOpen) return
            overlayOpen = true
            notify()
        },
        closeSourceOverlay() {
            if (!overlayOpen) return
            overlayOpen = false
            notify()
        },
        flagDropRejected(provider) {
            rejected = provider
            // Generation token so a stale toast timer can't clear a newer
            // rejection early (re-arming the same provider is intended).
            const g = ++toastGen
            notify()
            later(toastMs, () => {
                if (g === toastGen) {
                    rejected = null
                    notify()
                }
            })
        },
        destroy() {
            destroyed = true
            timers.forEach(t => {
                clearTimeout(t)
            })
            timers.clear()
            listeners.clear()
        },
    }
}
