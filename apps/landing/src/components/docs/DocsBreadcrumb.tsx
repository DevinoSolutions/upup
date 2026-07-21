import Link from 'next/link'
import { findTrail, type SidebarNode } from '@/lib/docs/sidebar-tree'

export function DocsBreadcrumb({
    tree,
    url,
}: {
    tree: SidebarNode[]
    url: string
}) {
    const trail = findTrail(tree, url) ?? []

    return (
        <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
        >
            <Link
                href="/docs/"
                className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
                Docs
            </Link>
            {trail.map((node, i) => {
                const last = i === trail.length - 1
                return (
                    <span
                        key={node.url ?? `${node.name}-${i}`}
                        className="flex items-center gap-1.5"
                    >
                        <span
                            aria-hidden
                            className="text-gray-300 dark:text-gray-600"
                        >
                            /
                        </span>
                        {last || !node.url ? (
                            <span
                                aria-current={last ? 'page' : undefined}
                                className={
                                    last ? 'text-gray-900 dark:text-white' : ''
                                }
                            >
                                {node.name}
                            </span>
                        ) : (
                            <Link
                                href={node.url}
                                className="transition-colors hover:text-gray-900 dark:hover:text-white"
                            >
                                {node.name}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
