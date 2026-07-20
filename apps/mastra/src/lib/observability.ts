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

const QUERY_KEY_ENV =
    'POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY'

/**
 * Hard runtime-isolation guards, mirroring the landing app's dataset boundary:
 *
 *   1. The e2e query READ key must never ride a `production` / `disabled`
 *      runtime — a test-only credential leaking into a real runtime is an
 *      operator error, so we throw BY NAME.
 *   2. The `e2e` dataset REQUIRES its own capture token; it never falls back to
 *      production credentials.
 */
function assertDatasetIsolation(
    dataset: PosthogDataset,
    token: string | undefined,
): void {
    if (
        dataset !== 'e2e' &&
        env.POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY
    ) {
        throw new Error(
            `[observability] The e2e query read key (${QUERY_KEY_ENV}) is set on a "${dataset}" runtime. ` +
                `This test-only credential must never ride a production/disabled runtime — ` +
                `unset it, or run with POSTHOG_DATASET=e2e.`,
        )
    }
    if (dataset === 'e2e' && !token) {
        throw new Error(
            '[observability] POSTHOG_DATASET=e2e requires POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN. ' +
                'Refusing to fall back to production credentials.',
        )
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
    assertDatasetIsolation(dataset, token)
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
