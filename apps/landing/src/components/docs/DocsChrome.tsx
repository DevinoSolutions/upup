'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { SidebarNode } from '@/lib/docs/sidebar-tree'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import {
    DocsSearchDialog,
    DocsSearchTrigger,
} from '@/components/docs/DocsSearch'
import { DocsAskAi } from '@/components/docs/DocsAskAi'
import { useDocsChat } from '@/lib/docs/use-docs-chat'

// Client shell that owns the Ask-AI state so the chat transcript survives
// client-side navigation between docs pages (DocsChrome never unmounts while in
// /docs). It lifts the docs chrome markup out of the server layout verbatim and
// only adds the Ask-AI trigger + drawer around it.
export function DocsChrome({
    tree,
    children,
}: {
    tree: SidebarNode[]
    children: ReactNode
}) {
    const [aiOpen, setAiOpen] = useState(false)
    // Search state lives here, next to aiOpen, so the two triggers below (mobile
    // disclosure + desktop sidebar) drive ONE dialog — see DocsSearchTrigger's
    // note for what rendering the whole widget twice used to break.
    const [searchOpen, setSearchOpen] = useState(false)
    const chat = useDocsChat()
    const openAi = () => setAiOpen(true)
    const openSearch = () => setSearchOpen(true)

    return (
        <div
            className={`mx-auto w-full min-w-0 max-w-6xl px-6 pb-16 pt-28 transition-[padding,max-width] duration-300 xl:max-w-[1400px] xl:px-10 ${
                aiOpen ? '2xl:max-w-[1804px] 2xl:pr-[404px]' : ''
            }`}
        >
            {/* Mobile: the sidebar collapses behind a native disclosure above the
                content — no animation lib, keyboard-accessible by default. */}
            <details className="mb-8 border-b border-black/5 pb-4 lg:hidden dark:border-white/10">
                <summary className="cursor-pointer list-none py-2 text-sm font-medium text-gray-900 dark:text-white">
                    Documentation menu
                </summary>
                <div className="space-y-3 pt-3">
                    <DocsSearchTrigger onClick={openSearch} />
                    {/* `-menu`, not `-mobile`: the floating pill below already
                        owns `docs-ask-ai-trigger-mobile`, and all three of these
                        triggers must be individually addressable. */}
                    <AskAiTrigger
                        testId="docs-ask-ai-trigger-menu"
                        onClick={openAi}
                    />
                    <DocsSidebar tree={tree} />
                </div>
            </details>

            <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-14">
                {/* Desktop sidebar — sticky under the fixed site header. */}
                <aside className="hidden lg:block">
                    <div className="docs-scrollbar sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pb-8">
                        <DocsSearchTrigger onClick={openSearch} />
                        <AskAiTrigger
                            testId="docs-ask-ai-trigger-desktop"
                            onClick={openAi}
                        />
                        <DocsSidebar tree={tree} />
                    </div>
                </aside>
                <div className="min-w-0">{children}</div>
            </div>

            {/* Floating mobile pill — always reachable while reading. */}
            <button
                type="button"
                data-testid="docs-ask-ai-trigger-mobile"
                onClick={openAi}
                className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-black/5 bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-gray-700 shadow-none lg:hidden dark:border-white/10 dark:text-gray-200"
            >
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Ask AI
            </button>

            {/* One dialog for both triggers above, and the single owner of the
                ⌘K listener + body-scroll lock. */}
            <DocsSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

            <DocsAskAi
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                chat={chat}
            />
        </div>
    )
}

function AskAiTrigger({
    testId,
    onClick,
}: {
    testId: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            className="flex w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/[0.16]"
        >
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Ask AI</span>
        </button>
    )
}
