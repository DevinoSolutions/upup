import type { ReactNode } from 'react'
import type { Node, Root } from 'fumadocs-core/page-tree'

// fumadocs names/toc titles are ReactNode — often a fragment or element, not a
// bare string — so String() yields "[object Object]". Pull the text out instead.
export function nodeToText(node: ReactNode): string {
    if (node == null || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number')
        return String(node)
    if (Array.isArray(node)) return node.map(nodeToText).join('')
    if (typeof node === 'object' && 'props' in node) {
        return nodeToText(
            (node as { props?: { children?: ReactNode } }).props?.children,
        )
    }
    return ''
}

// Plain, serializable shape of a docs-tree node. fumadocs PageTree nodes carry
// ReactNode names (they can hold icons), so they cannot cross the server→client
// boundary into <DocsSidebar> untouched — toSidebarTree() flattens them.
export interface SidebarNode {
    type: 'page' | 'folder' | 'separator'
    name: string
    url?: string
    children?: SidebarNode[]
}

export function toSidebarTree(tree: Root): SidebarNode[] {
    return tree.children.map(mapNode)
}

function mapNode(node: Node): SidebarNode {
    if (node.type === 'separator') {
        return { type: 'separator', name: nodeToText(node.name) }
    }
    if (node.type === 'folder') {
        // A folder's index page (if any) becomes the clickable folder label.
        return {
            type: 'folder',
            name: nodeToText(node.name),
            url: node.index?.url,
            children: node.children.map(mapNode),
        }
    }
    return { type: 'page', name: nodeToText(node.name), url: node.url }
}

// Strip a single trailing slash so /docs/x and /docs/x/ compare equal — the app
// runs trailingSlash:true, so usePathname() and node urls disagree by the slash.
export function normalizeUrl(url: string): string {
    return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url
}

// Walk the tree to the node matching `url`, returning the trail of nodes from the
// top-level ancestor down to the target. Used by the breadcrumb.
export function findTrail(
    nodes: SidebarNode[],
    url: string,
): SidebarNode[] | null {
    const target = normalizeUrl(url)
    for (const node of nodes) {
        if (node.url && normalizeUrl(node.url) === target) return [node]
        if (node.children) {
            const rest = findTrail(node.children, url)
            if (rest) return [node, ...rest]
        }
    }
    return null
}
