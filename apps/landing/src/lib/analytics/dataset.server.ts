import { env } from '@/lib/env'
import {
    credentialsFor,
    hasProductionKey,
    resolveDataset,
    type DatasetCredentials,
    type PosthogDataset,
} from './dataset'

// Server half of the dataset boundary. It lives apart from dataset.ts because
// it reads the zod-validated SERVER env (`@/lib/env`), and dataset.ts is also
// imported by client components (the PostHog provider, the support form): one
// shared module meant the zod runtime shipped on every page's first load.

const QUERY_KEY_ENV =
    'POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY'

/**
 * Hard runtime-isolation guards enforced at the server dataset boundary:
 *
 *   1. The e2e query READ key must never ride a `production` / `disabled`
 *      runtime — its presence there is an operator error (test credentials
 *      leaked into a real runtime), so we throw BY NAME rather than silently
 *      capturing.
 *   2. The `e2e` dataset REQUIRES its own host + capture token; it never falls
 *      back to production credentials. A missing e2e credential throws instead
 *      of quietly reaching the production project.
 *
 * There is deliberately no `e2e` → `production` (or reverse) credential
 * fallback anywhere: each dataset only ever uses its own project's keys.
 */
function assertServerDatasetIsolation(
    dataset: PosthogDataset,
    creds: DatasetCredentials,
): void {
    if (
        dataset !== 'e2e' &&
        env.POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY
    ) {
        throw new Error(
            `[analytics] The e2e query read key (${QUERY_KEY_ENV}) is set on a "${dataset}" runtime. ` +
                `This test-only credential must never ride a production/disabled runtime — ` +
                `unset it, or run with POSTHOG_DATASET=e2e.`,
        )
    }
    if (dataset === 'e2e' && (!creds.host || !creds.token)) {
        throw new Error(
            '[analytics] POSTHOG_DATASET=e2e requires NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST ' +
                'and NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN. Refusing to fall back to ' +
                'production credentials.',
        )
    }
}

/**
 * Server-side dataset resolution (reads the server `POSTHOG_DATASET`).
 * Throws on a hard dataset-isolation misconfiguration (see
 * `assertServerDatasetIsolation`) — an operator error that must fail loudly,
 * not a per-event runtime failure.
 */
export function serverDatasetCredentials(): DatasetCredentials {
    const dataset = resolveDataset(env.POSTHOG_DATASET, hasProductionKey())
    const creds = credentialsFor(dataset)
    assertServerDatasetIsolation(dataset, creds)
    return creds
}
