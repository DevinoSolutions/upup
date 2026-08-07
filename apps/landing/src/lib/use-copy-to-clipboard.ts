'use client'

import { useCallback } from 'react'
import { useCopied } from './use-copied'

/** How long the "copied" acknowledgement stays on screen by default. */
const COPIED_RESET_MS = 2000

/**
 * Write text to the clipboard and flash a transient `copied` acknowledgement.
 *
 * The app previously carried four near-identical inline versions of this (the
 * hero install box — twice, in fact — the framework snippets, and the Ask-AI
 * code block) and they had already drifted: only one cleared its reset timer on
 * unmount. The unmount-safe timer lives in `useCopied`; this hook adds the
 * clipboard write so a caller only supplies the text.
 *
 * `copy` takes the text at call time rather than as an argument to the hook, so
 * a caller whose text changes with the UI (the selected package manager, the
 * active framework tab) never copies a stale value. Render one hook per copy
 * control — each keeps its own acknowledgement.
 *
 * Failures are swallowed: `navigator.clipboard` is undefined in insecure
 * contexts and rejects without a user gesture, and neither is worth an error
 * state on a convenience affordance.
 */
export function useCopyToClipboard(delayMs: number = COPIED_RESET_MS): {
    copied: boolean
    copy: (text: string) => void
} {
    const { copied, markCopied } = useCopied(delayMs)

    const copy = useCallback(
        (text: string) => {
            if (typeof window === 'undefined' || !navigator.clipboard) return
            void navigator.clipboard
                .writeText(text)
                .then(markCopied)
                .catch(() => {})
        },
        [markCopied],
    )

    return { copied, copy }
}
