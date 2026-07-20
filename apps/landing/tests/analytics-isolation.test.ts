import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The dataset boundary + server capture read `env`/`clientEnv`, which parse
// process.env once at import time. So every test here sets process.env, resets
// the module registry, THEN dynamically imports — the only way to exercise a
// specific runtime's dataset resolution deterministically.

const h = vi.hoisted(() => ({
    captureMock: vi.fn(),
    shutdownMock: vi.fn(),
    postHogCtor: vi.fn(),
}))

vi.mock('posthog-node', () => ({ PostHog: h.postHogCtor }))

const MANAGED_ENV = [
    'POSTHOG_DATASET',
    'NEXT_PUBLIC_POSTHOG_DATASET',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST',
    'NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST',
    'NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN',
    'POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY',
] as const

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
    for (const key of MANAGED_ENV) saved[key] = process.env[key]
    h.captureMock.mockReset()
    h.shutdownMock.mockReset().mockResolvedValue(undefined)
    h.postHogCtor.mockReset().mockImplementation(function PostHog() {
        return { capture: h.captureMock, shutdown: h.shutdownMock }
    })
})

afterEach(() => {
    for (const key of MANAGED_ENV) {
        const value = saved[key]
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
})

function setEnv(overrides: Record<string, string | undefined>) {
    for (const key of MANAGED_ENV) delete process.env[key]
    for (const [key, value] of Object.entries(overrides)) {
        if (value !== undefined) process.env[key] = value
    }
    vi.resetModules()
}

const PROD_CREDS = {
    NEXT_PUBLIC_POSTHOG_KEY: 'phc_prod_key',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://prod.posthog.test',
}
const E2E_CREDS = {
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST: 'https://e2e.posthog.test',
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: 'phc_e2e_token',
}

async function loadDataset() {
    return import('@/lib/analytics/dataset')
}

describe('serverDatasetCredentials — runtime isolation', () => {
    it('throws when the e2e query read key rides a production runtime', async () => {
        setEnv({
            POSTHOG_DATASET: 'production',
            ...PROD_CREDS,
            POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY:
                'phx_query_key',
        })
        const { serverDatasetCredentials } = await loadDataset()
        expect(() => serverDatasetCredentials()).toThrow(
            /query read key.*production/i,
        )
    })

    it('throws when the e2e query read key rides a disabled runtime', async () => {
        setEnv({
            POSTHOG_DATASET: 'disabled',
            POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY:
                'phx_query_key',
        })
        const { serverDatasetCredentials } = await loadDataset()
        expect(() => serverDatasetCredentials()).toThrow(
            /query read key.*disabled/i,
        )
    })

    it('throws when the e2e dataset is missing its capture token/host', async () => {
        setEnv({ POSTHOG_DATASET: 'e2e' })
        const { serverDatasetCredentials } = await loadDataset()
        expect(() => serverDatasetCredentials()).toThrow(
            /POSTHOG_DATASET=e2e requires/i,
        )
    })

    it('production uses production creds even when e2e creds are also present (no fallback)', async () => {
        setEnv({ POSTHOG_DATASET: 'production', ...PROD_CREDS, ...E2E_CREDS })
        const { serverDatasetCredentials } = await loadDataset()
        const creds = serverDatasetCredentials()
        expect(creds).toEqual({
            dataset: 'production',
            host: 'https://prod.posthog.test',
            token: 'phc_prod_key',
        })
    })

    it('e2e uses e2e creds even when production creds are also present (no fallback)', async () => {
        setEnv({ POSTHOG_DATASET: 'e2e', ...PROD_CREDS, ...E2E_CREDS })
        const { serverDatasetCredentials } = await loadDataset()
        const creds = serverDatasetCredentials()
        expect(creds).toEqual({
            dataset: 'e2e',
            host: 'https://e2e.posthog.test',
            token: 'phc_e2e_token',
        })
    })

    it('does not throw on a clean production runtime (no query key present)', async () => {
        setEnv({ POSTHOG_DATASET: 'production', ...PROD_CREDS })
        const { serverDatasetCredentials } = await loadDataset()
        expect(() => serverDatasetCredentials()).not.toThrow()
    })
})

describe('captureServerEvent — e2e test-context gating', () => {
    async function loadCapture() {
        return import('@/lib/analytics/capture.server')
    }

    it('merges test_run_id / test_scenario into the event on the e2e dataset', async () => {
        setEnv({ POSTHOG_DATASET: 'e2e', ...E2E_CREDS })
        const { captureServerEvent } = await loadCapture()
        const res = await captureServerEvent(
            'evt',
            'did',
            { foo: 'bar' },
            {
                testRunId: 'e2e:1-a',
                testScenario: 'support-happy-path',
            },
        )
        expect(res.ok).toBe(true)
        const props = h.captureMock.mock.calls[0][0].properties
        expect(props.test_run_id).toBe('e2e:1-a')
        expect(props.test_scenario).toBe('support-happy-path')
        expect(props.environment).toBe('e2e')
        expect(props.app_id).toBe('upup-landing')
    })

    it('never attaches test context on the production dataset', async () => {
        setEnv({ POSTHOG_DATASET: 'production', ...PROD_CREDS })
        const { captureServerEvent } = await loadCapture()
        const res = await captureServerEvent(
            'evt',
            'did',
            { foo: 'bar' },
            {
                testRunId: 'e2e:1-a',
                testScenario: 'support-happy-path',
            },
        )
        expect(res.ok).toBe(true)
        const props = h.captureMock.mock.calls[0][0].properties
        expect(props.test_run_id).toBeUndefined()
        expect(props.test_scenario).toBeUndefined()
        expect(props.foo).toBe('bar')
    })
})
