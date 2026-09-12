// Server component: the per-docs-page JSON-LD — BreadcrumbList + TechArticle.
//
// Built from the SAME `tree`/`url` inputs <DocsBreadcrumb> renders visually, so
// the markup can never describe a different hierarchy than the page shows. The
// two nodes point at the site-wide entities by @id (emitted once from the root
// layout) rather than restating publisher details per page.
//
// No `datePublished`/`dateModified`: content/docs carries no frontmatter dates
// and there is no build-time git-mtime map yet. An invented date is worse than
// no date — Google treats a date it can't corroborate in the page as a quality
// signal against the markup, so the field stays out until a real source exists.

import {
    ORGANIZATION_ID,
    WEBSITE_ID,
} from '@/components/StructuredData/EntityStructuredData'
import { findTrail, type SidebarNode } from '@/lib/docs/sidebar-tree'
import { canonicalUrl } from '@/lib/site-url'

export function DocsStructuredData({
    tree,
    url,
    title,
    description,
}: {
    tree: SidebarNode[]
    url: string
    title: string
    description?: string
}) {
    // Same call the visual breadcrumb makes; the "Docs" root crumb is rendered
    // unconditionally there, so it leads the list here too.
    const trail = findTrail(tree, url) ?? []
    const crumbs: { name: string; url?: string }[] = [
        { name: 'Docs', url: '/docs' },
        ...trail.map(node => ({ name: node.name, url: node.url })),
    ]

    const breadcrumbList = {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.name,
            // A folder with no index page has no URL to point at; schema.org
            // allows a ListItem to carry only a name, so omit `item` instead
            // of fabricating a target.
            ...(crumb.url ? { item: canonicalUrl(crumb.url) } : {}),
        })),
    }

    const techArticle = {
        '@type': 'TechArticle',
        headline: title,
        ...(description ? { description } : {}),
        url: canonicalUrl(url),
        isPartOf: { '@id': WEBSITE_ID },
        publisher: { '@id': ORGANIZATION_ID },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@graph': [breadcrumbList, techArticle],
                }),
            }}
        />
    )
}
