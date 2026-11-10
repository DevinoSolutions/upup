import { afterAll, describe, expect, it, vi } from 'vitest'
import {
    POSTHOG_REPLAY_SAMPLE_RATE,
    REPLAY_BLOCK_SELECTORS,
    REPLAY_MASK_SELECTORS,
} from '@/lib/analytics/replay'
import { TELEMETRY_PATH } from '@/lib/analytics/telemetry-proxy'

// bootPostHog is the one place posthog.init() is called. The replay constants
// are pinned in sentry-tunnel.test.ts; this proves they actually reach init.

const posthog = vi.hoisted(() => ({
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
}))
vi.mock('posthog-js', () => ({ default: posthog }))

async function boot(env: Record<string, string>) {
    vi.resetModules()
    vi.unstubAllEnvs()
    posthog.init.mockClear()
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
    const { bootPostHog } = await import('@/components/posthog-provider')
    bootPostHog()
}

afterAll(() => {
    vi.unstubAllEnvs()
})

describe('bootPostHog', () => {
    it('starts PostHog with the shared session replay settings', async () => {
        await boot({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' })
        // The SDK arrives through a dynamic import.
        await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1))
        const [token, options] = posthog.init.mock.calls[0]!
        expect(token).toBe('phc_test')
        expect(options).toMatchObject({
            api_host: TELEMETRY_PATH,
            session_recording: {
                sampleRate: POSTHOG_REPLAY_SAMPLE_RATE,
                maskAllInputs: true,
                maskTextSelector: REPLAY_MASK_SELECTORS.join(', '),
                blockSelector: REPLAY_BLOCK_SELECTORS.join(', '),
            },
        })
    })

    it('never loads PostHog on the disabled dataset', async () => {
        await boot({
            NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
            NEXT_PUBLIC_POSTHOG_DATASET: 'disabled',
        })
        // Let any dynamic import bootPostHog started finish before checking.
        await vi.dynamicImportSettled()
        expect(posthog.init).not.toHaveBeenCalled()
    })
})
