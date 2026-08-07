'use client'

import { Check, Copy } from 'lucide-react'
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard'

// The overlay every code card wears: an optional language pill and a
// copy button that reveals on hover/focus of the card. Positioned absolutely
// against a `.upup-code group relative` shell, which the caller owns.
//
// Rendered by both the MDX code fence (CodeBlock) and the framework tab panel
// (FrameworkTabsClient) so the two stay pixel-identical by construction — they
// previously carried duplicate copies of this markup.
//
// `getText` is called at click time rather than taking the text as a prop: the
// fence reads it off a live DOM ref, the tab panel off whichever tab is active.
export function CodeCardControls({
    language,
    getText,
}: {
    language?: string
    getText: () => string
}) {
    const { copied, copy } = useCopyToClipboard(1600)

    return (
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex items-center gap-2">
            {language ? (
                <span className="select-none rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/40">
                    {language}
                </span>
            ) : null}
            <button
                type="button"
                onClick={() => copy(getText())}
                aria-label={copied ? 'Copied' : 'Copy code'}
                className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-white/50 opacity-0 transition-[opacity,color,background-color] duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/80 focus-visible:opacity-100 group-hover:opacity-100"
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </button>
        </div>
    )
}
