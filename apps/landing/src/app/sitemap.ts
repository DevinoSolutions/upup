import type { MetadataRoute } from 'next'
import { FRAMEWORK_IDS } from '@/lib/frameworks'
import { source } from '@/lib/docs/source'
import { canonicalUrl } from '@/lib/site-url'

// A handful of docs entry points get a priority bump over the 0.6 docs
// baseline — the pages searchers actually land on first.
const HIGH_VALUE_DOCS = new Set([
    '/docs',
    '/docs/getting-started',
    '/docs/guides/server-mode-setup',
    '/docs/quickstarts/react',
    '/docs/quickstarts/next',
])

// No `lastModified` anywhere below, deliberately. It used to be a single
// `new Date()` evaluated once per build and stamped on all 73 URLs, which told
// Google that every page changed on every deploy — Google's documented
// response to a lastmod it cannot corroborate is to ignore the field for the
// whole site. There is no real per-page date to use yet (content/docs carries
// no frontmatter dates and there is no build-time git-mtime map), and an
// invented one is worse than an absent one. Omitting it is valid sitemap XML.
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: canonicalUrl(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        // Per-framework landing pages (/react, /vue, …) — high-value entry points.
        ...FRAMEWORK_IDS.map((id): MetadataRoute.Sitemap[number] => ({
            url: canonicalUrl(id),
            changeFrequency: 'weekly',
            priority: 0.9,
        })),
        {
            url: canonicalUrl('support'),
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: canonicalUrl('privacy'),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        // EVERY docs page, derived from the fumadocs source — a page added to
        // content/docs lands here (and in search engines) with no manual list
        // to forget. page.url already carries the /docs prefix.
        ...source.getPages().map((page): MetadataRoute.Sitemap[number] => ({
            url: canonicalUrl(page.url),
            changeFrequency: 'monthly',
            priority: HIGH_VALUE_DOCS.has(page.url.replace(/\/$/, ''))
                ? 0.8
                : 0.6,
        })),
    ]
}
