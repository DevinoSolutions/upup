import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A momentary "copied" flag that flips true and clears itself after `delayMs`.
 *
 * The timer is owned by a ref and cleared on unmount, so a component that
 * unmounts inside the window (navigating away right after a copy) never calls
 * setState on a dead component. Re-marking restarts the window rather than
 * stacking timers.
 *
 * `reset` clears the flag immediately — for callers tracking a second, mutually
 * exclusive state (see DocsCopyPage's failed flag).
 */
export function useCopied(delayMs: number) {
    const [copied, setCopied] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current)
        },
        [],
    )

    const markCopied = useCallback(() => {
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), delayMs)
    }, [delayMs])

    const reset = useCallback(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = null
        setCopied(false)
    }, [])

    return { copied, markCopied, reset }
}
