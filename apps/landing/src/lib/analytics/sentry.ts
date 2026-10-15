import { clientEnv } from '@/lib/client/env'
import { isProductionSite } from '@/lib/site-url'
import {
    REPLAY_MASK_SELECTORS,
    REPLAY_ON_ERROR_SAMPLE_RATE,
    REPLAY_SESSION_SAMPLE_RATE,
} from './replay'
import { SENTRY_TUNNEL_PATH, sentryEnvelopeUrl } from './sentry-tunnel'

// Guard against re-initialising during React Strict Mode's double-invoke and
// across client-side navigations.
let bootStarted = false

/**
 * Start Sentry (errors + session replay) in the browser. A build without
 * NEXT_PUBLIC_SENTRY_DSN (local dev, e2e, previews that do not set it) does
 * nothing. Like posthog-js, the SDK is loaded with a dynamic import, never
 * statically, so it stays off every page's first load; the provider calls
 * this at the same deferred moment it boots PostHog.
 */
export function bootSentry(): void {
    if (bootStarted) return
    const dsn = clientEnv.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn || !sentryEnvelopeUrl(dsn)) return
    bootStarted = true

    void import('@sentry/browser')
        .then(Sentry => {
            Sentry.init({
                dsn,
                tunnel: SENTRY_TUNNEL_PATH,
                environment: isProductionSite() ? 'production' : 'preview',
                // Errors and replays only. Performance tracing is not used.
                tracesSampleRate: 0,
                replaysSessionSampleRate: REPLAY_SESSION_SAMPLE_RATE,
                replaysOnErrorSampleRate: REPLAY_ON_ERROR_SAMPLE_RATE,
                integrations: [
                    Sentry.replayIntegration({
                        // Sentry's privacy defaults, stated so they cannot be
                        // dropped by accident: all text, inputs and media
                        // are masked or blocked in the recording.
                        maskAllText: true,
                        maskAllInputs: true,
                        blockAllMedia: true,
                        mask: REPLAY_MASK_SELECTORS,
                    }),
                ],
            })
        })
        .catch(() => {
            // Error tracking failing to load must never break the page.
        })
}
