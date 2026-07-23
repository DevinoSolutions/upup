'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

// "Copy page" — fetches the page's raw-markdown twin (the force-static
// /docs-md route) and writes it to the clipboard, with a brief copied state.
// Own tiny copied-state on purpose; shares no component with the other docs
// chrome so it stays self-contained.
export function DocsCopyPage({ mdUrl }: { mdUrl: string }) {
    const [copied, setCopied] = useState(false)
    const [failed, setFailed] = useState(false)

    async function copy() {
        try {
            const res = await fetch(mdUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const markdown = await res.text()
            await navigator.clipboard.writeText(markdown)
            setFailed(false)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setFailed(true)
            setTimeout(() => setFailed(false), 2000)
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
