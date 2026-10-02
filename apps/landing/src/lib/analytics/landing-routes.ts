/**
 * The marketing landing routes — the home page and the per-framework landing
 * pages (`/react/`, `/vue/`, …). Only these boot PostHog after the page has
 * loaded instead of at mount, because they are the pages PageSpeed scores and
 * the SDK (~95 KB compressed) competed with the hero for the network and the
 * main thread. Every other route (docs, support, agent-setup, …) keeps
 * initialising PostHog at mount.
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
