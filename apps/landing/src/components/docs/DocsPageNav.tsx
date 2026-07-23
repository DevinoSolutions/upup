import Link from 'next/link'
import { ArrowLeft, ArrowRight, Github } from 'lucide-react'
import { normalizeUrl, type SidebarNode } from '@/lib/docs/sidebar-tree'

interface FlatPage {
    name: string
    url: string
    section?: string
}

// Depth-first flatten of the same sidebar tree DocsSidebar renders, so prev/next
// order is byte-identical to the visible sidebar order. Separators set the
// section label for their following siblings; a folder with an index url is a
// navigable page in its own right, and also sets the section for its children.
// Folders without a url (e.g. Quickstarts) are section labels only, not pages.
function flatten(
    nodes: SidebarNode[],
    section: string | undefined,
    out: FlatPage[],
): void {
    for (const node of nodes) {
        if (node.type === 'separator') {
            section = node.name
            continue
        }
        if (node.type === 'folder') {
            if (node.url) out.push({ name: node.name, url: node.url, section })
            if (node.children) flatten(node.children, node.name, out)
            continue
        }
        if (node.url) out.push({ name: node.name, url: node.url, section })
    }
}

// The /docs root (DocsHome) is not a sequence entry — the first real article
// must have no previous card, matching the reading flow.
function isHome(url: string): boolean {
    return normalizeUrl(url) === '/docs'
}

export function DocsPageNav({
    tree,
    url,
    githubEditUrl,
}: {
    tree: SidebarNode[]
    url: string
    githubEditUrl: string
}) {
    const flat: FlatPage[] = []
    flatten(tree, undefined, flat)
    const sequence = flat.filter(page => !isHome(page.url))

    const idx = sequence.findIndex(
        page => normalizeUrl(page.url) === normalizeUrl(url),
    )
    const prev = idx > 0 ? sequence[idx - 1] : null
    const next =
        idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : null

    return (
        <footer className="mt-16 border-t border-black/5 pt-6 dark:border-white/10">
            <div className="mb-6 flex justify-end">
                <a
                    href={githubEditUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <Github className="h-4 w-4" aria-hidden />
                    Edit this page on GitHub
                </a>
            </div>

            <nav
                aria-label="Previous and next page"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
                {prev ? (
                    <PageNavCard page={prev} direction="prev" />
                ) : (
                    <span aria-hidden className="hidden sm:block" />
                )}
                {next ? (
                    <PageNavCard page={next} direction="next" />
                ) : (
                    <span aria-hidden className="hidden sm:block" />
                )}
            </nav>
        </footer>
    )
}

function PageNavCard({
    page,
    direction,
}: {
    page: FlatPage
    direction: 'prev' | 'next'
}) {
    const isNext = direction === 'next'
    return (
        <Link
            href={page.url}
            className={`group flex flex-col rounded-lg border border-black/5 p-4 transition-all hover:-translate-y-0.5 hover:border-black/10 hover:shadow-sm dark:border-white/10 dark:hover:border-white/20 ${
                isNext ? 'sm:text-right' : ''
            }`}
        >
            <span
                className={`flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 ${
                    isNext ? 'sm:justify-end' : ''
                }`}
            >
                {!isNext && (
                    <ArrowLeft
                        className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                    />
                )}
                {isNext ? 'Next' : 'Previous'}
                {isNext && (
                    <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                    />
                )}
            </span>
            {page.section && (
                <span className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {page.section}
                </span>
            )}
            <span className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                {page.name}
            </span>
        </Link>
    )
}
