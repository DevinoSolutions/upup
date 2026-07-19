import { clientEnv, env } from '@/lib/env'

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

/** Server-side dataset resolution (reads the server `POSTHOG_DATASET`). */
export function serverDatasetCredentials(): DatasetCredentials {
    return credentialsFor(
        resolveDataset(env.POSTHOG_DATASET, hasProductionKey()),
    )
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
