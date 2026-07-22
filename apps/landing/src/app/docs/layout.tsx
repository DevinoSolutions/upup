import type { ReactNode } from 'react'
import { source } from '@/lib/docs/source'
import { toSidebarTree } from '@/lib/docs/sidebar-tree'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { DocsSearch } from '@/components/docs/DocsSearch'

// The site header (Navbar) is rendered globally in the root layout, so docs
// pages inherit it — this layout only builds the docs-specific chrome and clears
// the fixed h-24 header with pt-28.
export default function DocsLayout({ children }: { children: ReactNode }) {
    const tree = toSidebarTree(source.pageTree)

    return (
        <div className="mx-auto w-full min-w-0 max-w-6xl px-6 pb-16 pt-28">
            {/* Mobile: the sidebar collapses behind a native disclosure above the
                content — no animation lib, keyboard-accessible by default. */}
            <details className="mb-8 border-b border-black/5 pb-4 lg:hidden dark:border-white/10">
                <summary className="cursor-pointer list-none py-2 text-sm font-medium text-gray-900 dark:text-white">
                    Documentation menu
                </summary>
                <div className="space-y-3 pt-3">
                    <DocsSearch />
                    <DocsSidebar tree={tree} />
                </div>
            </details>

            <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
                {/* Desktop sidebar — sticky under the fixed site header. */}
                <aside className="hidden lg:block">
                    <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pb-8">
                        <DocsSearch />
                        <DocsSidebar tree={tree} />
                    </div>
                </aside>
                <div className="min-w-0">{children}</div>
            </div>
        </div>
    )
}
