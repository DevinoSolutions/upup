import { TELEMETRY_PATH } from './telemetry-proxy'

/**
 * First-party Sentry path, the same idea as the PostHog one in
 * telemetry-proxy.ts: the browser posts envelopes to this same-origin URL
 * (Sentry's `tunnel` option) and a next.config rewrite forwards them to the
 * Sentry instance. Filter lists match Sentry's host and its `/envelope/`
 * path, so neither appears in the URL the browser requests. The trailing
 * slash matters: with trailingSlash:true a slashless POST would be answered
 * with a 308 and the envelope dropped.
 *
 * next.config.mjs mirrors sentryEnvelopeUrl (it cannot import from src).
 * src/__tests__/sentry-tunnel.test.ts runs the tunnel URL through Next's own
 * rewrite matcher and fails if the two copies drift.
 */
export const SENTRY_TUNNEL_PATH = `${TELEMETRY_PATH}/x/`

/**
 * The envelope endpoint a DSN reports to
 * (`https://<key>@<host>[/<prefix>]/<projectId>` ->
 * `https://<host>[/<prefix>]/api/<projectId>/envelope/`), or null when the
 * value is not a usable DSN. Sentry reads the DSN from the envelope header, so
 * the forwarded request needs no key of its own.
 */
export function sentryEnvelopeUrl(dsn: string | undefined): string | null {
    if (!dsn) return null
    let url: URL
    try {
        url = new URL(dsn)
    } catch {
        return null
    }
    const segments = url.pathname.split('/').filter(Boolean)
    const projectId = segments.pop()
    if (!url.username || !projectId || !/^\d+$/.test(projectId)) return null
    const prefix = segments.map(segment => `/${segment}`).join('')
    return `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`
}
