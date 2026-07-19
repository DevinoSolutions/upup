import { PostHog } from 'posthog-node'
import { APP_ID } from './contract'
import { serverDatasetCredentials } from './dataset'

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
 * `e2e` dataset the environment/app_id are force-tagged so ingested test events
 * can be isolated and queried (test_run_id / test_scenario stay caller-supplied).
 */
export async function captureServerEvent(
    event: string,
    distinctId: string,
    properties: Record<string, unknown> = {},
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
            ? { ...properties, environment: 'e2e', app_id: APP_ID }
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
