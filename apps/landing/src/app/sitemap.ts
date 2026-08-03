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

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date()

    return [
        {
            url: canonicalUrl(),
            lastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        // Per-framework landing pages (/react, /vue, …) — high-value entry points.
        ...FRAMEWORK_IDS.map((id): MetadataRoute.Sitemap[number] => ({
            url: canonicalUrl(id),
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        })),
        {
            url: canonicalUrl('privacy'),
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        // EVERY docs page, derived from the fumadocs source — a page added to
        // content/docs lands here (and in search engines) with no manual list
        // to forget. page.url already carries the /docs prefix.
        ...source.getPages().map((page): MetadataRoute.Sitemap[number] => ({
            url: canonicalUrl(page.url),
            lastModified,
            changeFrequency: 'monthly',
            priority: HIGH_VALUE_DOCS.has(page.url.replace(/\/$/, ''))
                ? 0.8
                : 0.6,
        })),
    ]
}
