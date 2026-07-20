import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Runtime-isolation contract for the PostHog AI-tracing observability config.
 * `lib/env.js` parses process.env once at import, so each test sets env, resets
 * the module registry, THEN dynamically imports to get a deterministic dataset
 * resolution.
 */

const ENV_KEYS = [
    'POSTHOG_DATASET',
    'POSTHOG_KEY',
    'POSTHOG_HOST',
    'POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN',
    'POSTHOG_E2E_TEST_PROJECT_HOST',
    'POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY',
] as const
type EnvKey = (typeof ENV_KEYS)[number]

const saved: Partial<Record<EnvKey, string | undefined>> = {}

beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
})

afterEach(() => {
    for (const key of ENV_KEYS) {
        const value = saved[key]
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
})

function setEnv(overrides: Partial<Record<EnvKey, string>>) {
    for (const key of ENV_KEYS) delete process.env[key]
    for (const [key, value] of Object.entries(overrides)) {
        if (value !== undefined) process.env[key] = value
    }
    vi.resetModules()
}

async function loadObservability() {
    return import('./observability.js')
}

describe('buildObservability — runtime isolation', () => {
    it('returns an empty config (tracing off) on the disabled dataset', async () => {
        setEnv({ POSTHOG_DATASET: 'disabled' })
        const { buildObservability } = await loadObservability()
        expect(buildObservability()).toEqual({})
    })

    it('throws when the e2e query read key rides a production runtime', async () => {
        setEnv({
            POSTHOG_DATASET: 'production',
            POSTHOG_KEY: 'phc_prod',
            POSTHOG_HOST: 'https://prod.posthog.test',
            POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY:
                'phx_query',
        })
        const { buildObservability } = await loadObservability()
        expect(() => buildObservability()).toThrow(
            /query read key.*production/i,
        )
    })

    it('throws when the e2e query read key rides a disabled runtime', async () => {
        setEnv({
            POSTHOG_DATASET: 'disabled',
            POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY:
                'phx_query',
        })
        const { buildObservability } = await loadObservability()
        expect(() => buildObservability()).toThrow(/query read key.*disabled/i)
    })

    it('throws when the e2e dataset is missing its capture token', async () => {
        setEnv({ POSTHOG_DATASET: 'e2e' })
        const { buildObservability } = await loadObservability()
        expect(() => buildObservability()).toThrow(
            /POSTHOG_DATASET=e2e requires/i,
        )
    })

    it('builds an e2e-tagged config from the e2e token (never the production key)', async () => {
        setEnv({
            POSTHOG_DATASET: 'e2e',
            POSTHOG_KEY: 'phc_prod',
            POSTHOG_HOST: 'https://prod.posthog.test',
            POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: 'phc_e2e',
            POSTHOG_E2E_TEST_PROJECT_HOST: 'https://e2e.posthog.test',
        })
        const { buildObservability } = await loadObservability()
        const config = buildObservability()
        expect(config.environment).toBe('e2e')
        expect(config.observability).toBeDefined()
    })

    it('builds a production-tagged config from the production key', async () => {
        setEnv({
            POSTHOG_DATASET: 'production',
            POSTHOG_KEY: 'phc_prod',
            POSTHOG_HOST: 'https://prod.posthog.test',
        })
        const { buildObservability } = await loadObservability()
        const config = buildObservability()
        expect(config.environment).toBe('production')
        expect(config.observability).toBeDefined()
    })

    it('does not throw on a clean production runtime (no query key present)', async () => {
        setEnv({
            POSTHOG_DATASET: 'production',
            POSTHOG_KEY: 'phc_prod',
            POSTHOG_HOST: 'https://prod.posthog.test',
        })
        const { buildObservability } = await loadObservability()
        expect(() => buildObservability()).not.toThrow()
    })
})
