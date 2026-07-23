import type { ReactNode } from 'react'
import { source } from '@/lib/docs/source'
import { toSidebarTree } from '@/lib/docs/sidebar-tree'
import { DocsChrome } from '@/components/docs/DocsChrome'
import '@/components/docs/docs-chrome.css'

// The site header (Navbar) is rendered globally in the root layout, so docs
// pages inherit it — this layout only builds the serializable sidebar tree and
// hands it to the client chrome, which clears the fixed h-24 header with pt-28.
export default function DocsLayout({ children }: { children: ReactNode }) {
    const tree = toSidebarTree(source.pageTree)

    return <DocsChrome tree={tree}>{children}</DocsChrome>
}
