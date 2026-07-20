import { clientEnv, env } from '@/lib/env'
import { APP_ID } from './contract'

/**
 * Which PostHog project a runtime talks to. Runtime isolation is the point:
 * `production` uses the public production key/host; `e2e` uses a SEPARATE
 * test project's credentials (so automated runs never pollute production);
 * `disabled` turns analytics off entirely.
 */
export type PosthogDataset = 'production' | 'e2e' | 'disabled'

const KNOWN_DATASETS: readonly PosthogDataset[] = [
    'production',
    'e2e',
    'disabled',
]

const isDataset = (value: string | undefined): value is PosthogDataset =>
    value !== undefined && (KNOWN_DATASETS as readonly string[]).includes(value)

/**
 * Resolve the dataset from an explicit selector plus whether a production key
 * exists. An explicit valid value always wins; otherwise default to
 * `production` only when a production key is present, else `disabled`. There is
 * deliberately NO fallback from `e2e` to `production` — the caller enforces
 * that the e2e credentials are actually present before capturing.
 */
export function resolveDataset(
    explicit: string | undefined,
    hasProductionKey: boolean,
): PosthogDataset {
    if (isDataset(explicit)) return explicit
    return hasProductionKey ? 'production' : 'disabled'
}

export interface DatasetCredentials {
    dataset: PosthogDataset
    host?: string
    token?: string
}

function credentialsFor(dataset: PosthogDataset): DatasetCredentials {
    switch (dataset) {
        case 'production':
            return {
                dataset,
                host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
                token: clientEnv.NEXT_PUBLIC_POSTHOG_KEY,
            }
        case 'e2e':
            return {
                dataset,
                host: clientEnv.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST,
                token: clientEnv.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN,
            }
        case 'disabled':
            return { dataset }
    }
}

const hasProductionKey = (): boolean =>
    Boolean(clientEnv.NEXT_PUBLIC_POSTHOG_KEY)

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

/**
 * Client-side dataset resolution (reads `NEXT_PUBLIC_POSTHOG_DATASET`, which
 * the deploy mirrors from the server value at build time).
 */
export function clientDatasetCredentials(): DatasetCredentials {
    return credentialsFor(
        resolveDataset(
            clientEnv.NEXT_PUBLIC_POSTHOG_DATASET,
            hasProductionKey(),
        ),
    )
}

// ── E2E test-run correlation channel (honored ONLY on the `e2e` dataset) ──
//
// A Playwright run stamps a per-run id + per-test scenario so its ingested
// events are isolable from every other run's. The browser reads them from
// localStorage (set by the spec via addInitScript) and registers them as
// PostHog super-properties; the server reads them from the request body. Both
// paths gate on the dataset being `e2e` — on production/disabled they are
// inert, never attached.

/** localStorage key the browser reads its e2e correlation context from. */
export const E2E_TEST_CONTEXT_STORAGE_KEY = 'upup:e2e-test-context'

export interface E2ETestContext {
    testRunId?: string
    testScenario?: string
}

/** Parse the JSON e2e-context blob, tolerating absence/garbage (returns {}). */
export function parseE2ETestContext(
    raw: string | null | undefined,
): E2ETestContext {
    if (!raw) return {}
    try {
        const value = JSON.parse(raw) as Record<string, unknown>
        const ctx: E2ETestContext = {}
        if (typeof value.testRunId === 'string') ctx.testRunId = value.testRunId
        if (typeof value.testScenario === 'string')
            ctx.testScenario = value.testScenario
        return ctx
    } catch {
        return {}
    }
}

/** Read the browser's e2e correlation context from localStorage (SSR-safe). */
export function readE2ETestContext(): E2ETestContext {
    if (typeof window === 'undefined') return {}
    try {
        return parseE2ETestContext(
            window.localStorage.getItem(E2E_TEST_CONTEXT_STORAGE_KEY),
        )
    } catch {
        return {}
    }
}

/**
 * PostHog super-properties to register in the browser. Non-empty ONLY on the
 * `e2e` dataset — tags every browser event with `app_id`/`environment` plus the
 * run's correlation ids so the ingestion-verification query can find them.
 */
export function e2eSuperProperties(
    dataset: PosthogDataset,
    ctx: E2ETestContext,
): Record<string, string> {
    if (dataset !== 'e2e') return {}
    const props: Record<string, string> = {
        app_id: APP_ID,
        environment: 'e2e',
    }
    if (ctx.testRunId) props.test_run_id = ctx.testRunId
    if (ctx.testScenario) props.test_scenario = ctx.testScenario
    return props
}
