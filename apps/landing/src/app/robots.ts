import type { MetadataRoute } from 'next'
import { isProductionSite, siteUrl } from '@/lib/site-url'

// Replaces the former static public/robots.txt, which hardcoded the PRODUCTION
// sitemap URL and shipped unchanged to every host — so the dev deployment
// pointed crawlers at production's sitemap while advertising itself as fully
// crawlable. Deriving from siteUrl() keeps prod's semantics identical and makes
// every non-production host self-consistent instead.
//
// `Disallow: /mobile-demo/` is NOT vestigial: src/app/mobile-demo/ is a real
// route on THIS app and returns 200 (verified live on both hosts). It is an
// unlinked demo harness that should stay out of the index — do not drop it.
// The playground app serves its own separate /mobile-demo; that one is covered
// by apps/playground/src/app/robots.ts, not this file.
export default function robots(): MetadataRoute.Robots {
    const sitemap = `${siteUrl()}/sitemap.xml`

    if (!isProductionSite()) {
        // Non-production hosts serve a byte-identical copy of the whole site.
        // Blanket-disallow so it can never be indexed as a duplicate; the
        // X-Robots-Tag: noindex header in next.config.mjs is the belt to this
        // set of braces, since robots.txt only governs crawling, not indexing
        // of URLs discovered elsewhere.
        return {
            rules: [{ userAgent: '*', disallow: '/' }],
            sitemap,
        }
    }

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/mobile-demo/'],
            },
        ],
        sitemap,
    }
}
