import { clientEnv } from '@/lib/client/env'
import { isProductionSite } from '@/lib/site-url'
import { scrubFailureMessage } from '@useupup/interactive-example/ai/scrubFailure'
import {
    REPLAY_BLOCK_SELECTORS,
    REPLAY_MASK_SELECTORS,
    REPLAY_ON_ERROR_SAMPLE_RATE,
    SENTRY_REPLAY_SAMPLE_RATE,
} from './replay'
import { SENTRY_TUNNEL_PATH, sentryEnvelopeUrl } from './sentry-tunnel'

// Guard against re-initialising during React Strict Mode's double-invoke and
// across client-side navigations.
let bootStarted = false

// The loaded SDK, set once Sentry.init has run. Null means "not initialised"
// (no DSN, or the dynamic import is still in flight), which is the no-op state
// for every reporter below.
let sentry: typeof import('@sentry/browser') | null = null

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
                replaysSessionSampleRate: SENTRY_REPLAY_SAMPLE_RATE,
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
                        block: REPLAY_BLOCK_SELECTORS,
                    }),
                ],
            })
            sentry = Sentry
        })
        .catch(() => {
            // Error tracking failing to load must never break the page.
        })
}

/** Which AI surface failed. `playground-chat` is the package Ask-AI panel. */
export type AiFailurePath = 'playground-chat' | 'docs-ask-ai'

export interface AiFailureReport {
    path: AiFailurePath
    agentId: string
    /**
     * `upstream-error` / `empty-reply`: the turn ended in the visible error
     * state. `stream-failed`: the stream failed or came back empty but the
     * turn still produced an answer (a warning, not an error).
     */
    kind: 'upstream-error' | 'empty-reply' | 'stream-failed'
    /** Short upstream/transport reason. Never the visitor prompt. */
    message?: string
}

/**
 * Send one Sentry event for an AI-assistant failure. A no-op until Sentry is
 * initialised, and it never throws: reporting must not change what the
 * visitor sees. The event carries only the path, agent id and kind as tags
 * plus a capped upstream reason, so the prompt and any key stay out of it.
 */
export function reportAiFailure(report: AiFailureReport): void {
    if (!sentry) return
    try {
        sentry.captureException(
            new Error(`AI assistant failure: ${report.kind}`),
            {
                level: report.kind === 'stream-failed' ? 'warning' : 'error',
                tags: {
                    ai_path: report.path,
                    ai_agent_id: report.agentId,
                    ai_failure_kind: report.kind,
                },
                fingerprint: ['ai-assistant-failure', report.path, report.kind],
                ...(report.message
                    ? {
                          extra: {
                              // Callers scrub the prompt (they know it);
                              // this is the backstop for key-like tokens
                              // plus the length cap.
                              upstream_message: scrubFailureMessage(
                                  report.message,
                              ),
                          },
                      }
                    : {}),
            },
        )
    } catch {
        // Error tracking failing must never break the chat.
    }
}
