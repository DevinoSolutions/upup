// Server component: the per-docs-page JSON-LD — BreadcrumbList + TechArticle,
// plus a FAQPage node on pages whose frontmatter carries `faq:`.
//
// Built from the SAME `tree`/`url` inputs <DocsBreadcrumb> renders visually, so
// the markup can never describe a different hierarchy than the page shows. The
// nodes point at the site-wide entities by @id (emitted once from the root
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

/** One `faq:` frontmatter entry (schema in source.config.ts). */
interface DocsFaqItem {
    q: string
    a: string
}

export function DocsStructuredData({
    tree,
    url,
    title,
    description,
    faq,
}: {
    tree: SidebarNode[]
    url: string
    title: string
    description?: string
    faq?: DocsFaqItem[]
}) {
    // Same call the visual breadcrumb makes; the "Docs" root crumb is rendered
    // unconditionally there, so it leads the list here too.
    const trail = findTrail(tree, url) ?? []
    const crumbs: { name: string; url?: string }[] = [
        { name: 'Docs', url: '/docs' },
        ...trail.map(node => ({ name: node.name, url: node.url })),
    ]

    // Google requires `item` on every ListItem except the last
    // (https://developers.google.com/search/docs/appearance/structured-data/breadcrumb),
    // and a folder with no index page has no URL to point at. So the trail
    // drops those name-only folder crumbs rather than fabricating a target,
    // and positions are numbered over what remains. The page's own crumb is
    // always last and always keeps its URL.
    const linkedCrumbs = crumbs.filter(
        (crumb, i) => crumb.url || i === crumbs.length - 1,
    )

    const breadcrumbList = {
        '@type': 'BreadcrumbList',
        itemListElement: linkedCrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.name,
            ...(crumb.url ? { item: canonicalUrl(crumb.url) } : {}),
        })),
    }

    const pageUrl = canonicalUrl(url)
    const techArticle = {
        '@type': 'TechArticle',
        headline: title,
        ...(description ? { description } : {}),
        url: pageUrl,
        isPartOf: { '@id': WEBSITE_ID },
        publisher: { '@id': ORGANIZATION_ID },
    }

    // Only pages that opt in via frontmatter get a FAQPage node — an empty
    // FAQPage is invalid markup, and FAQ markup on a page with no visible
    // Q&A is a structured-data policy violation.
    const faqPage = faq?.length
        ? {
              '@type': 'FAQPage',
              '@id': `${pageUrl}#faq`,
              url: pageUrl,
              isPartOf: { '@id': WEBSITE_ID },
              mainEntity: faq.map(item => ({
                  '@type': 'Question',
                  name: item.q,
                  acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
          }
        : null

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@graph': faqPage
                        ? [breadcrumbList, techArticle, faqPage]
                        : [breadcrumbList, techArticle],
                }),
            }}
        />
    )
}
