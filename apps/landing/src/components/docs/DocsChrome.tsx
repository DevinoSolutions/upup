'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { SidebarNode } from '@/lib/docs/sidebar-tree'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { DocsSearch } from '@/components/docs/DocsSearch'
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
    const chat = useDocsChat()
    const openAi = () => setAiOpen(true)

    return (
        <div
            className={`mx-auto w-full min-w-0 max-w-6xl px-6 pb-16 pt-28 transition-[padding,max-width] duration-300 ${
                aiOpen ? '2xl:max-w-[1532px] 2xl:pr-[404px]' : ''
            }`}
        >
            {/* Mobile: the sidebar collapses behind a native disclosure above the
                content — no animation lib, keyboard-accessible by default. */}
            <details className="mb-8 border-b border-black/5 pb-4 lg:hidden dark:border-white/10">
                <summary className="cursor-pointer list-none py-2 text-sm font-medium text-gray-900 dark:text-white">
                    Documentation menu
                </summary>
                <div className="space-y-3 pt-3">
                    <DocsSearch />
                    <AskAiTrigger
                        testId="docs-ask-ai-trigger"
                        onClick={openAi}
                    />
                    <DocsSidebar tree={tree} />
                </div>
            </details>

            <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
                {/* Desktop sidebar — sticky under the fixed site header. */}
                <aside className="hidden lg:block">
                    <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pb-8">
                        <DocsSearch />
                        <AskAiTrigger
                            testId="docs-ask-ai-trigger"
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
            className="flex w-full items-center gap-2 rounded-md border border-black/5 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-black/10 hover:text-gray-700 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-200"
        >
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Ask AI</span>
        </button>
    )
}
