import { PostHog } from 'posthog-node'
import { APP_ID } from './contract'
import { serverDatasetCredentials, type E2ETestContext } from './dataset'

export interface CaptureResult {
    ok: boolean
    /** Set when the call short-circuited because analytics is disabled. */
    skipped?: boolean
    error?: string
}

/**
 * Fire ONE server-side PostHog event against the dataset-selected project and
 * flush immediately (`flushAt: 1`). No-ops on the `disabled` dataset and NEVER
 * throws — every outcome is a typed {ok} the caller logs/branches on. On the
 * `e2e` dataset the environment/app_id are force-tagged, and the caller's
 * per-run test context (test_run_id / test_scenario) is merged, so ingested
 * test events can be isolated and queried. On every other dataset the e2e
 * context is inert (never attached).
 *
 * Throws only on a hard dataset-isolation misconfiguration surfaced by
 * `serverDatasetCredentials` (an operator error that must fail loudly); normal
 * per-event failures still resolve to a typed `{ ok: false }`.
 */
export async function captureServerEvent(
    event: string,
    distinctId: string,
    properties: Record<string, unknown> = {},
    e2eContext: E2ETestContext = {},
): Promise<CaptureResult> {
    const { dataset, host, token } = serverDatasetCredentials()
    if (dataset === 'disabled') return { ok: false, skipped: true }
    if (!host || !token) {
        return {
            ok: false,
            error: `posthog credentials missing for dataset "${dataset}"`,
        }
    }

    const finalProperties =
        dataset === 'e2e'
            ? {
                  ...properties,
                  environment: 'e2e',
                  app_id: APP_ID,
                  ...(e2eContext.testRunId
                      ? { test_run_id: e2eContext.testRunId }
                      : {}),
                  ...(e2eContext.testScenario
                      ? { test_scenario: e2eContext.testScenario }
                      : {}),
              }
            : properties

    try {
        const client = new PostHog(token, {
            host,
            flushAt: 1,
            flushInterval: 0,
        })
        client.capture({ distinctId, event, properties: finalProperties })
        await client.shutdown()
        return { ok: true }
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}
