import type { MetadataRoute } from 'next'
import { AI_CRAWLER_USER_AGENTS } from '@/lib/seo/ai-crawlers'
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

    // ONE disallow set, shared by both groups. A named AI crawler that got a
    // laxer list than `*` would be a side door into /api/ and the demo harness;
    // sharing the constant makes divergence impossible rather than unlikely.
    const disallow = ['/api/', '/mobile-demo/']

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow,
            },
            // The `*` rule above already permits these agents. Naming them is
            // an explicit, auditable allow: several are opt-out tokens
            // (Google-Extended, Applebot-Extended, anthropic-ai) whose absence
            // reads as "undecided" to a reviewer, and the docs corpus + llms.txt
            // exist precisely so these crawlers can quote us accurately.
            {
                userAgent: [...AI_CRAWLER_USER_AGENTS],
                allow: '/',
                disallow,
            },
        ],
        sitemap,
    }
}
