import { Observability } from '@mastra/observability'
import { PosthogExporter } from '@mastra/posthog'
import { env } from './env.js'

/**
 * Which PostHog project (if any) receives AI traces. Mirrors the landing app's
 * dataset isolation (apps/landing/src/lib/analytics/dataset.ts): `production`
 * uses the public key/host, `e2e` uses a SEPARATE test project so automated
 * runs never pollute production, `disabled` turns tracing off. There is
 * deliberately NO fallback from `e2e` to `production`.
 */
export type PosthogDataset = 'production' | 'e2e' | 'disabled'

function resolveDataset(): PosthogDataset {
    if (env.POSTHOG_DATASET) return env.POSTHOG_DATASET
    return env.POSTHOG_KEY ? 'production' : 'disabled'
}

function credentialsFor(dataset: PosthogDataset): {
    token?: string
    host?: string
} {
    switch (dataset) {
        case 'production':
            return { token: env.POSTHOG_KEY, host: env.POSTHOG_HOST }
        case 'e2e':
            return {
                token: env.POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN,
                host: env.POSTHOG_E2E_TEST_PROJECT_HOST,
            }
        case 'disabled':
            return {}
    }
}

export interface ObservabilityConfig {
    /** Spread into `new Mastra({...})`. Absent when tracing is off. */
    observability?: Observability
    /**
     * Spread into `new Mastra({...})`. Tags every trace's
     * `tracingOptions.metadata.environment` with the dataset name so e2e traces
     * are isolable from production ones. Absent when tracing is off.
     */
    environment?: string
}

/**
 * Build the Mastra observability config for the PostHog AI-tracing exporter.
 *
 * Returns an empty object (tracing OFF) on the `disabled` dataset or when the
 * selected dataset has no capture token — the exporter is never constructed
 * with a missing key. On `e2e` we flush every span immediately (`flushAt: 1`)
 * so live ingestion checks don't wait on the batch interval; production keeps
 * the default batching.
 *
 * The exporter reads request-scoped metadata the client sends on each
 * `generate` call: `metadata.userId` -> PostHog distinct id (fallback
 * `defaultDistinctId`), `metadata.sessionId` -> `$ai_session_id`, and every
 * other custom key (`app_id`, `agent_id`, `conversation_id`, ...) is spread
 * onto the `$ai_trace` event's properties. Model / tokens / latency / tool
 * calls come from the exporter's native span mapping — we do not hand-roll them.
 */
export function buildObservability(): ObservabilityConfig {
    const dataset = resolveDataset()
    const { token, host } = credentialsFor(dataset)
    if (dataset === 'disabled' || !token) return {}

    const exporter = new PosthogExporter({
        apiKey: token,
        ...(host ? { host } : {}),
        // e2e verification wants events visible without waiting on the batch
        // interval; production keeps the exporter's default batching.
        ...(dataset === 'e2e' ? { flushAt: 1 } : {}),
    })

    return {
        observability: new Observability({
            configs: {
                posthog: {
                    serviceName: 'upup-mastra',
                    exporters: [exporter],
                },
            },
        }),
        environment: dataset,
    }
}
