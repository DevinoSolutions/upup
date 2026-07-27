'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { DOCS_FRAMEWORK_LIST } from '@/lib/frameworks'
import { CodeCardControls } from './CodeCardControls'

// Per-tab brand icon, derived from the one docs framework registry the /docs
// "Pick your framework" pills also read. A tab without a registered icon just
// renders its label — the strip degrades cleanly.
const TAB_ICON: Record<string, { Icon: IconType; brand?: string }> =
    Object.fromEntries(
        DOCS_FRAMEWORK_LIST.map(fw => [
            fw.id,
            { Icon: fw.Icon, brand: fw.brand },
        ]),
    )

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

    return (
        <div
            className="my-6 [&>.upup-code]:mb-0 [&>.upup-code]:mt-0"
            data-testid="docs-framework-tabs"
        >
            <div
                role="tablist"
                aria-label="Framework"
                className="flex flex-wrap gap-x-0.5 border-b border-gray-200 dark:border-white/10"
            >
                {tabs.map(tab => {
                    const isActive = tab.fw === active.fw
                    const icon = TAB_ICON[tab.fw]
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
                            className={`-mb-px flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'border-blue-600 text-gray-900 dark:border-blue-400 dark:text-white'
                                    : 'border-transparent text-gray-500 hover:bg-black/[0.03] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                            }`}
                        >
                            {icon ? (
                                <icon.Icon
                                    size={15}
                                    aria-hidden
                                    className={isActive ? '' : 'opacity-70'}
                                    style={
                                        icon.brand
                                            ? { color: icon.brand }
                                            : undefined
                                    }
                                />
                            ) : null}
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
                <CodeCardControls
                    language={active.lang}
                    getText={() => active.code}
                />
                {/* Server-produced ReactNode (build-time repo content) — not a
                    raw-HTML sink; no user or model input ever reaches here. */}
                {active.highlighted}
            </div>
        </div>
    )
}
