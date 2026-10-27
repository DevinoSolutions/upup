import * as Sentry from '@sentry/node'
import { env } from './env.js'

/**
 * Installs the Sentry client. A FUNCTION the entry calls, never a module-level
 * side effect: `mastra build` bundles with Rollup's `treeshake: "smallest"`
 * (@mastra/deployer), which sets `moduleSideEffects: false`, so a bare
 * `import './sentry'` is dropped from the bundle whole. Sendly's mastra ran
 * with SENTRY_DSN set and no client at all for 30 days that way.
 */
export function initSentry(): boolean {
    if (!env.SENTRY_DSN) return false
    Sentry.init({
        dsn: env.SENTRY_DSN,
        environment:
            env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
        // Errors only: the agents' traces already go to PostHog.
        tracesSampleRate: 0,
        // Never attach request bodies, IPs or cookies: the playground chat is
        // anonymous visitors' text.
        sendDefaultPii: false,
    })
    return true
}
