import { clientEnv } from '@/lib/env'

// The ONE home for the site's public base URL. Canonical/OG metadata, the
// sitemap, JSON-LD, and llms.txt all derive from here — a hardcoded
// 'https://useupup.com' outside this file splits the base URL across surfaces
// (the deployed dev site would canonicalize half its pages to production).
const DEFAULT_SITE_URL = 'https://useupup.com'

/**
 * The one production host. Every other host this app is served from (dev,
 * previews, localhost) is a NON-canonical copy of the same 70+ pages, so
 * robots/indexing decisions key off this rather than NODE_ENV — a dev deploy
 * is a production BUILD, it is just not the production SITE.
 */
export const PRODUCTION_HOST = new URL(DEFAULT_SITE_URL).host

/** True only when this deployment is serving the canonical public site. */
export function isProductionSite(): boolean {
    return new URL(siteUrl()).host === PRODUCTION_HOST
}

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
