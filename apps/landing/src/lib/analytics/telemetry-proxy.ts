/**
 * First-party PostHog path. The browser never talks to the PostHog host
 * directly: posthog-js is pointed at this same-origin prefix and next.config's
 * rewrites forward each request to the real instance. Blockers filter on the
 * PostHog hostname (EasyPrivacy's `://posthog.$script` catches the self-hosted
 * instance's scripts) and on PostHog's well-known paths, which match on any
 * host (uBlock's privacy list has `/e/*^ip=*^compression=`). So the prefix is
 * opaque and every path a list targets is renamed too.
 *
 * next.config.mjs mirrors TELEMETRY_PATH and TELEMETRY_ROUTES (it cannot
 * import from src). src/__tests__/telemetry-proxy.test.ts replays real
 * posthog-js request URLs through Next's own rewrite matcher and fails if the
 * two copies drift.
 */
export const TELEMETRY_PATH = '/_t/9lc5'

/**
 * PostHog path prefix -> the opaque segment the browser requests instead.
 * Longest first: `/i/v0/e/` has to win over `/e/`. Paths not listed here
 * (e.g. `/api/...`) keep their name and go through the catch-all rewrite.
 */
export const TELEMETRY_ROUTES: ReadonlyArray<
    readonly [posthogPrefix: string, opaquePrefix: string]
> = [
    ['/i/v0/e/', '/b/'],
    ['/e/', '/c/'],
    ['/s/', '/r/'],
    ['/flags/', '/f/'],
    ['/static/', '/a/'],
    ['/array/', '/k/'],
]

/**
 * posthog-js `rewriteRequestPath` hook: renames the PostHog path that follows
 * TELEMETRY_PATH. Every other URL is returned untouched.
 */
export function rewriteTelemetryPath(url: URL): URL {
    if (!url.pathname.startsWith(`${TELEMETRY_PATH}/`)) return url
    const rest = url.pathname.slice(TELEMETRY_PATH.length)
    for (const [posthogPrefix, opaquePrefix] of TELEMETRY_ROUTES) {
        if (rest.startsWith(posthogPrefix)) {
            url.pathname = `${TELEMETRY_PATH}${opaquePrefix}${rest.slice(posthogPrefix.length)}`
            break
        }
    }
    return url
}
