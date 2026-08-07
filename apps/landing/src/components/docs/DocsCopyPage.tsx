'use client'

import { Check, Copy } from 'lucide-react'
import { useCopied } from '@/lib/use-copied'

// "Copy page" — fetches the page's raw-markdown twin (the force-static
// /docs-md route) and writes it to the clipboard, with a brief copied state.
// Deliberately shares no COMPONENT with the other docs chrome — it is a
// text-labelled toolbar button, not a code-card overlay, so it stays
// self-contained. It does borrow useCopied for the momentary flags, which is
// where the unmount-safe timer lives; `failed` is its own second flag, since
// only this button can fail (the others copy from memory or the DOM).
export function DocsCopyPage({ mdUrl }: { mdUrl: string }) {
    const { copied, markCopied } = useCopied(2000)
    const {
        copied: failed,
        markCopied: markFailed,
        reset: clearFailed,
    } = useCopied(2000)

    async function copy() {
        try {
            const res = await fetch(mdUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const markdown = await res.text()
            await navigator.clipboard.writeText(markdown)
            clearFailed()
            markCopied()
        } catch {
            markFailed()
        }
    }

    return (
        <button
            type="button"
            onClick={copy}
            data-testid="docs-copy-page"
            aria-label="Copy page as Markdown"
            className="inline-flex items-center gap-1.5 rounded-md border border-black/5 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-black/10 hover:text-gray-900 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white"
        >
            {copied ? (
                <Check
                    className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
                    aria-hidden
                />
            ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy page'}
        </button>
    )
}
