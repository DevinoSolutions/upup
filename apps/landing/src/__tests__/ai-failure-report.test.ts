import { beforeEach, describe, expect, it, vi } from 'vitest'

// reportAiFailure is the one Sentry door for AI-assistant failures. It must be
// a no-op until Sentry has actually been initialised (no DSN, or the SDK is
// still loading), and when live it must send exactly one tagged event that
// never carries the visitor's prompt.

const env = vi.hoisted(() => ({
    NEXT_PUBLIC_SENTRY_DSN: undefined as string | undefined,
}))
vi.mock('@/lib/client/env', () => ({ clientEnv: env }))
vi.mock('@/lib/site-url', () => ({ isProductionSite: () => false }))

const sdk = vi.hoisted(() => ({
    init: vi.fn(),
    captureException: vi.fn(),
    replayIntegration: vi.fn(() => ({ name: 'Replay' })),
}))
vi.mock('@sentry/browser', () => sdk)

const DSN = 'https://abc123@sentry.example.test/42'
const PROMPT = 'secret-prompt-text-7731'

async function loadFresh() {
    vi.resetModules()
    return import('@/lib/analytics/sentry')
}

async function liveSentry() {
    env.NEXT_PUBLIC_SENTRY_DSN = DSN
    const mod = await loadFresh()
    mod.bootSentry()
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1))
    return mod
}

beforeEach(() => {
    env.NEXT_PUBLIC_SENTRY_DSN = undefined
    sdk.init.mockClear()
    sdk.captureException.mockClear()
})

describe('reportAiFailure', () => {
    it('is a no-op when Sentry was never initialised (no DSN)', async () => {
        const { bootSentry, reportAiFailure } = await loadFresh()
        bootSentry()

        reportAiFailure({
            path: 'docs-ask-ai',
            agentId: 'docs-agent',
            kind: 'empty-reply',
        })

        expect(sdk.init).not.toHaveBeenCalled()
        expect(sdk.captureException).not.toHaveBeenCalled()
    })

    it('sends one tagged event once Sentry is live', async () => {
        const { reportAiFailure } = await liveSentry()

        reportAiFailure({
            path: 'docs-ask-ai',
            agentId: 'docs-agent',
            kind: 'upstream-error',
            message: 'HTTP 502',
        })

        expect(sdk.captureException).toHaveBeenCalledTimes(1)
        const [error, hint] = sdk.captureException.mock.calls[0]!
        expect(error).toBeInstanceOf(Error)
        expect(hint).toMatchObject({
            level: 'error',
            tags: {
                ai_path: 'docs-ask-ai',
                ai_agent_id: 'docs-agent',
                ai_failure_kind: 'upstream-error',
            },
        })
    })

    it('reports a swallowed stream failure at warning level', async () => {
        const { reportAiFailure } = await liveSentry()

        reportAiFailure({
            path: 'docs-ask-ai',
            agentId: 'docs-agent',
            kind: 'stream-failed',
            message: 'empty stream',
        })

        expect(sdk.captureException).toHaveBeenCalledTimes(1)
        expect(sdk.captureException.mock.calls[0]![1]).toMatchObject({
            level: 'warning',
        })
    })

    it('never carries the prompt and caps the upstream message', async () => {
        const { reportAiFailure } = await liveSentry()

        reportAiFailure({
            path: 'playground-chat',
            agentId: 'playground-agent',
            kind: 'upstream-error',
            message: 'x'.repeat(5000),
        })

        const serialised = JSON.stringify(
            sdk.captureException.mock.calls,
            (_key, value) =>
                value instanceof Error
                    ? { message: value.message, stack: value.stack }
                    : value,
        )
        expect(serialised).not.toContain(PROMPT)
        expect(serialised.length).toBeLessThan(2500)
    })

    it('swallows an SDK failure', async () => {
        const { reportAiFailure } = await liveSentry()
        sdk.captureException.mockImplementationOnce(() => {
            throw new Error('sdk down')
        })

        expect(() =>
            reportAiFailure({
                path: 'docs-ask-ai',
                agentId: 'docs-agent',
                kind: 'empty-reply',
            }),
        ).not.toThrow()
    })
})
