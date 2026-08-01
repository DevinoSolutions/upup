import { clientEnv } from '@/lib/env'

// The ONE home for the site's public base URL. Canonical/OG metadata, the
// sitemap, JSON-LD, and llms.txt all derive from here — a hardcoded
// 'https://useupup.com' outside this file splits the base URL across surfaces
// (the deployed dev site would canonicalize half its pages to production).
const DEFAULT_SITE_URL = 'https://useupup.com'

/** Origin without a trailing slash — for asset URLs (`${siteUrl()}/img/…`). */
export function siteUrl(): string {
    return (clientEnv.NEXT_PUBLIC_BASE_URL || DEFAULT_SITE_URL).replace(
        /\/+$/,
        '',
    )
}

/**
 * Absolute page URL WITH a trailing slash — next.config runs
 * trailingSlash:true, so every page is actually served at the slashed URL and
 * a slashless canonical points at a 308, not the page.
 */
export function canonicalUrl(path = ''): string {
    const clean = path.replace(/^\/+|\/+$/g, '')
    return clean ? `${siteUrl()}/${clean}/` : `${siteUrl()}/`
}
