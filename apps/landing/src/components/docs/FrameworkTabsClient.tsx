'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

export interface FrameworkTab {
    /** Canonical framework id — also the `?fw=` deep-link value. */
    fw: string
    /** Display name shown in the tab strip. */
    label: string
    /** Language label shown on the code card (matches CodeBlock). */
    lang: string
    /** The raw snippet text — what the copy button writes to the clipboard. */
    code: string
    /** Server-highlighted snippet (a shiki <pre> ReactNode). */
    highlighted: ReactNode
}

// One reader-wide framework choice, shared across every FrameworkTabs instance
// on the page and across navigations via localStorage. The native `storage`
// event only fires in *other* tabs, so a same-document custom event keeps
// sibling instances in sync within this tab. A `?fw=` deep link wins over the
// stored value on load.
const STORAGE_KEY = 'upup-docs-framework'
const SYNC_EVENT = 'upup-docs-framework-change'

function readStored(): string | null {
    try {
        return window.localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function writeStored(fw: string): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, fw)
    } catch {
        // Storage disabled (private mode) — in-page selection still works.
    }
}

export function FrameworkTabsClient({ tabs }: { tabs: FrameworkTab[] }) {
    // Server and first client render must agree, so start on the first tab
    // (canonical order puts React first) and reconcile the persisted /
    // deep-linked choice in an effect after mount — avoids a hydration mismatch.
    const [selected, setSelected] = useState(tabs[0].fw)
    const [copied, setCopied] = useState(false)
    const baseId = useId()

    useEffect(() => {
        const inTabs = (fw: string | null): fw is string =>
            fw !== null && tabs.some(t => t.fw === fw)
        const deepLink = new URLSearchParams(window.location.search).get('fw')
        if (inTabs(deepLink)) {
            // Deep link wins over storage and becomes the sticky choice.
            setSelected(deepLink)
            writeStored(deepLink)
            window.dispatchEvent(
                new CustomEvent(SYNC_EVENT, { detail: deepLink }),
            )
            return
        }
        // A stored framework this topic doesn't offer falls back to the first
        // tab without clobbering the shared choice.
        const stored = readStored()
        if (inTabs(stored)) setSelected(stored)
    }, [tabs])

    useEffect(() => {
        function apply(fw: string | null) {
            if (fw !== null && tabs.some(t => t.fw === fw)) setSelected(fw)
        }
        const onSync = (e: Event) => apply((e as CustomEvent<string>).detail)
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) apply(e.newValue)
        }
        window.addEventListener(SYNC_EVENT, onSync)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener(SYNC_EVENT, onSync)
            window.removeEventListener('storage', onStorage)
        }
    }, [tabs])

    function choose(fw: string) {
        setSelected(fw)
        writeStored(fw)
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: fw }))
    }

    const active = tabs.find(t => t.fw === selected) ?? tabs[0]
    const panelId = `${baseId}-panel`
    const activeTabId = `${baseId}-tab-${active.fw}`

    async function copy() {
        try {
            await navigator.clipboard.writeText(active.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
        } catch {
            // Clipboard API unavailable in insecure contexts — no-op.
        }
    }

    return (
        <div
            className="my-6 [&>.upup-code]:mb-0 [&>.upup-code]:mt-0"
            data-testid="docs-framework-tabs"
        >
            <div
                role="tablist"
                aria-label="Framework"
                className="flex flex-wrap gap-x-1 border-b border-black/5 dark:border-white/10"
            >
                {tabs.map(tab => {
                    const isActive = tab.fw === active.fw
                    return (
                        <button
                            key={tab.fw}
                            type="button"
                            role="tab"
                            id={`${baseId}-tab-${tab.fw}`}
                            aria-selected={isActive}
                            aria-controls={panelId}
                            tabIndex={isActive ? 0 : -1}
                            data-testid={`docs-framework-tab-${tab.fw}`}
                            onClick={() => choose(tab.fw)}
                            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>
            {/* Reuses the article code-card shell (.upup-code) so the highlighted
                snippet is byte-for-byte the same look as a fenced code block. */}
            <div
                role="tabpanel"
                id={panelId}
                aria-labelledby={activeTabId}
                tabIndex={0}
                className="upup-code group relative"
            >
                <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex items-center gap-2">
                    <span className="select-none rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/40">
                        {active.lang}
                    </span>
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
                {/* Server-produced ReactNode (build-time repo content) — not a
                    raw-HTML sink; no user or model input ever reaches here. */}
                {active.highlighted}
            </div>
        </div>
    )
}
