'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { normalizeUrl, type SidebarNode } from '@/lib/docs/sidebar-tree'

export type { SidebarNode }

export function DocsSidebar({ tree }: { tree: SidebarNode[] }) {
    const pathname = usePathname()
    return (
        <nav aria-label="Docs" className="docs-scrollbar text-sm">
            <ul className="space-y-0.5">
                {tree.map((node, i) => (
                    <SidebarNodeView
                        key={node.url ?? `${node.type}-${i}`}
                        node={node}
                        pathname={pathname}
                    />
                ))}
            </ul>
        </nav>
    )
}

function SidebarNodeView({
    node,
    pathname,
}: {
    node: SidebarNode
    pathname: string
}) {
    if (node.type === 'separator') {
        return (
            <li className="px-2 pb-1 pt-6 text-xs font-semibold uppercase tracking-wider text-gray-500 first:pt-0 dark:text-gray-400">
                {node.name}
            </li>
        )
    }

    if (node.type === 'folder') {
        return (
            <li className="pt-2">
                {node.url ? (
                    <PageLink node={node} pathname={pathname} bold />
                ) : (
                    <span className="block px-2 py-1.5 font-medium text-gray-900 dark:text-white">
                        {node.name}
                    </span>
                )}
                {node.children && node.children.length > 0 ? (
                    <ul className="ml-3 space-y-0.5 border-l border-black/5 pl-3 dark:border-white/10">
                        {node.children.map((child, i) => (
                            <SidebarNodeView
                                key={child.url ?? `${child.type}-${i}`}
                                node={child}
                                pathname={pathname}
                            />
                        ))}
                    </ul>
                ) : null}
            </li>
        )
    }

    return (
        <li>
            <PageLink node={node} pathname={pathname} />
        </li>
    )
}

function PageLink({
    node,
    pathname,
    bold = false,
}: {
    node: SidebarNode
    pathname: string
    bold?: boolean
}) {
    const active =
        !!node.url && normalizeUrl(pathname) === normalizeUrl(node.url)
    return (
        <Link
            href={node.url as string}
            aria-current={active ? 'page' : undefined}
            className={`block rounded-md px-2 py-1.5 transition-colors ${
                active
                    ? 'bg-black/[0.04] font-medium text-gray-900 dark:bg-white/[0.06] dark:text-white'
                    : `text-gray-600 hover:bg-black/[0.03] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-white ${
                          bold ? 'font-medium' : ''
                      }`
            }`}
        >
            {node.name}
        </Link>
    )
}
