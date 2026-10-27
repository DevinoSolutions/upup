import type { MetadataRoute } from 'next'
import { FRAMEWORK_IDS } from '@/lib/frameworks'
import { source } from '@/lib/docs/source'
import { canonicalUrl } from '@/lib/site-url'
import { AGENT_IDS } from '@/lib/agent-setup/config'
import { pageLastmodDate } from '@/lib/page-lastmod'

// A handful of docs entry points get a priority bump over the 0.6 docs
// baseline — the pages searchers actually land on first.
const HIGH_VALUE_DOCS = new Set([
    '/docs',
    '/docs/getting-started',
    '/docs/guides/server-mode-setup',
    '/docs/quickstarts/react',
    '/docs/quickstarts/next',
])

type SitemapEntry = MetadataRoute.Sitemap[number]

// `lastModified` is the UTC date (YYYY-MM-DD) of the last commit that touched
// what the page renders: its route files, the shared sections and data modules
// it reads, or its docs .mdx. It comes from the committed snapshot
// apps/landing/src/generated/page-lastmod.json, which
// scripts/seo/page-lastmod.mjs regenerates from git in the pre-commit hook and
// checks in CI (the deploy image has no .git to ask). Never a build-time
// `new Date()`: that once stamped every URL with each deploy's time, and
// Google ignores a lastmod it cannot corroborate site-wide. A real per-page
// date also lets the daily IndexNow run submit only the pages that changed.
// A page with no snapshot entry throws, failing the build.
function entry(
    path: string,
    fields: Omit<SitemapEntry, 'url' | 'lastModified'>,
): SitemapEntry {
    return {
        url: canonicalUrl(path),
        lastModified: pageLastmodDate(`/${path.replace(/^\/+/, '')}`),
        ...fields,
    }
}

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        entry('', { changeFrequency: 'weekly', priority: 1 }),
        // Per-framework landing pages (/react, /vue, …) — high-value entry points.
        ...FRAMEWORK_IDS.map(id =>
            entry(id, { changeFrequency: 'weekly', priority: 0.9 }),
        ),
        entry('support', { changeFrequency: 'monthly', priority: 0.4 }),
        entry('privacy', { changeFrequency: 'yearly', priority: 0.3 }),
        // Agent onboarding: the index + one guide per agent. prompt.md is
        // deliberately NOT listed — it is a fetch target for agents, not a
        // page (robots still allows it).
        entry('agent-setup', { changeFrequency: 'monthly', priority: 0.7 }),
        ...AGENT_IDS.map(agent =>
            entry(`agent-setup/${agent}`, {
                changeFrequency: 'monthly',
                priority: 0.5,
            }),
        ),
        // EVERY docs page, derived from the fumadocs source — a page added to
        // content/docs lands here (and in search engines) with no manual list
        // to forget. page.url already carries the /docs prefix.
        ...source.getPages().map(page =>
            entry(page.url, {
                changeFrequency: 'monthly',
                priority: HIGH_VALUE_DOCS.has(page.url.replace(/\/$/, ''))
                    ? 0.8
                    : 0.6,
            }),
        ),
    ]
}
