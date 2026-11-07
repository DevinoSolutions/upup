/**
 * The marketing landing routes — the home page and the per-framework landing
 * pages (`/react/`, `/vue/`, …) — and the docs (`/docs/…`) start the analytics
 * SDKs (PostHog and Sentry) after the page has loaded instead of at mount,
 * because they are the pages PageSpeed scores and the SDKs (~100 KB and
 * ~135 KB compressed) competed with first paint for the network and the main
 * thread (T-2848 moved the docs over). Every other route (support,
 * agent-setup, …) keeps initialising at mount; see `analyticsBootMode`.
 *
 * The framework slugs are listed here rather than imported from
 * `@/lib/frameworks`, which pulls react-icons and the snippet table into
 * whatever imports it; the root-layout provider must stay light. A unit test
 * pins this list to FRAMEWORK_IDS so a new framework page cannot be missed.
 */
export const LANDING_FRAMEWORK_SLUGS = [
    'react',
    'vue',
    'svelte',
    'angular',
    'vanilla',
    'preact',
] as const

/**
 * Where the cloud-drive sign-in popups land (`spec.redirectPath` of the
 * OneDrive / Dropbox / Box plugins in @useupup/core). The URL carries the
 * provider's one-time `code` and `state` until the opener reads it and closes
 * the popup, so PostHog never boots on these routes: a $pageview there would
 * copy the code into analytics. A unit test pins this list to the plugins.
 */
export const OAUTH_REDIRECT_PATHS = [
    '/od_redirect',
    '/dp_redirect',
    '/box_redirect',
] as const

export function isOAuthRedirectPath(pathname: string | null): boolean {
    if (!pathname) return false
    const clean = pathname.replace(/\/+$/, '')
    return (OAUTH_REDIRECT_PATHS as readonly string[]).includes(clean)
}

export function isMarketingLandingPath(pathname: string | null): boolean {
    if (!pathname) return false
    const clean = pathname.replace(/\/+$/, '')
    if (clean === '') return true
    const slug = clean.replace(/^\/+/, '')
    return (LANDING_FRAMEWORK_SLUGS as readonly string[]).includes(slug)
}

/** The docs section: `/docs`, `/docs/…`. Not `/docs-md/…` (markdown handlers). */
export function isDocsPath(pathname: string | null): boolean {
    if (!pathname) return false
    const clean = pathname.replace(/\/+$/, '')
    return clean === '/docs' || clean.startsWith('/docs/')
}

/**
 * How the root-layout provider starts the analytics SDKs on a route: `skip`
 * (OAuth popup pages), `after-load` (marketing landing pages and docs: after
 * the load event, in an idle slot or on the first input), or `at-mount`
 * (everything else, as before).
 */
export function analyticsBootMode(
    pathname: string | null,
): 'skip' | 'after-load' | 'at-mount' {
    if (isOAuthRedirectPath(pathname)) return 'skip'
    if (isMarketingLandingPath(pathname) || isDocsPath(pathname))
        return 'after-load'
    return 'at-mount'
}
