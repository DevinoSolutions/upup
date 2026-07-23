'use client'

import { Check, Copy } from 'lucide-react'
import { useRef, useState, type ComponentProps } from 'react'

// Wraps the shiki <pre> emitted by fumadocs-mdx. The pre keeps its own
// syntax-highlight classes/styles (see globals.css for the --shiki-* colour
// activation); this shell adds a language label and a copy button over the
// existing dark navy code card. The `icon` attribute fumadocs stamps on the
// pre is only meaningful with fumadocs-ui (forbidden here), so it is dropped.
export function CodeBlock({
    icon: _icon,
    'data-language': language,
    className,
    ...props
}: ComponentProps<'pre'> & { 'data-language'?: string; icon?: string }) {
    const preRef = useRef<HTMLPreElement>(null)
    const [copied, setCopied] = useState(false)

    async function copy() {
        const text = preRef.current?.textContent ?? ''
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
        } catch {
            // Clipboard API is unavailable in insecure contexts — no-op.
        }
    }

    return (
        <div className="upup-code group relative">
            <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex items-center gap-2">
                {language ? (
                    <span className="select-none rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/40">
                        {language}
                    </span>
                ) : null}
                <button
                    type="button"
                    onClick={copy}
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
            <pre ref={preRef} className={className} {...props} />
        </div>
    )
}
