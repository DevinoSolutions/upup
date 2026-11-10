import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Boundary mock: the Sentry SDK. What the reporter HANDS it is under test.
const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }))
vi.mock('@sentry/node', () => ({ captureException, init: vi.fn() }))

import {
    modelFailureEvent,
    reportModelFailure,
    upstreamStatus,
} from './model-failure.js'

const PROMPT = 'my secret visitor prompt: only allow images up to 5 MB'

/** Shaped like the AI SDK's APICallError: the prompt rides on requestBodyValues. */
function apiCallError(status: number, message: string) {
    return Object.assign(new Error(message), {
        statusCode: status,
        requestBodyValues: { messages: [{ role: 'user', content: PROMPT }] },
        responseBody: `{"error":"${message}","echo":"${PROMPT}"}`,
    })
}

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

describe('agent model failures reach Sentry without the visitor prompt', () => {
    afterEach(() => vi.clearAllMocks())

    it('a 404 for a retired model id is reported with the agent, the status and the reason', () => {
        reportModelFailure('playground-agent')({
            error: apiCallError(404, 'No endpoints found for x/y'),
        })
        expect(captureException).toHaveBeenCalledTimes(1)
        const [event, hint] = captureException.mock.calls[0]
        expect(event).toBeInstanceOf(Error)
        expect(event.name).toBe('AgentModelFailure')
        expect(event.message).toContain(
            'playground-agent model call failed with HTTP 404',
        )
        expect(event.message).toContain('No endpoints found for x/y')
        expect(hint.tags).toMatchObject({
            agent: 'playground-agent',
            upstream_status: '404',
        })
    })

    it('never sends the AI SDK error object, whose requestBodyValues hold the prompt', () => {
        const original = apiCallError(500, 'upstream broke')
        reportModelFailure('docs-agent')({ error: original })
        const [event, hint] = captureException.mock.calls[0]
        expect(event).not.toBe(original)
        expect(
            JSON.stringify({
                event: { ...event, message: event.message, stack: event.stack },
                hint,
            }),
        ).not.toContain(PROMPT)
        expect(event).not.toHaveProperty('requestBodyValues')
        expect(event).not.toHaveProperty('responseBody')
    })

    it('a provider reason longer than 200 characters is cut', () => {
        const event = modelFailureEvent(
            'docs-agent',
            new Error('x'.repeat(5000)),
        )
        expect(event.message.length).toBeLessThan(400)
    })

    it('a timeout or network failure with no status says so', () => {
        expect(upstreamStatus(new Error('fetch failed'))).toBeUndefined()
        reportModelFailure('docs-agent')({ error: new Error('fetch failed') })
        expect(captureException.mock.calls[0][0].message).not.toContain('HTTP')
        expect(captureException.mock.calls[0][1].tags.upstream_status).toBe(
            'none',
        )
    })

    it('finds the status on a wrapped cause', () => {
        expect(upstreamStatus({ cause: { cause: { statusCode: 429 } } })).toBe(
            429,
        )
    })

    it('both agents carry the hook, and the entry CALLS initSentry (a side-effect import is dropped by mastra build)', () => {
        for (const agent of ['playground-agent', 'docs-agent']) {
            const src = readFileSync(
                here(`../mastra/agents/${agent}.ts`),
                'utf8',
            )
            expect(src).toContain(`onError: reportModelFailure('${agent}')`)
        }
        const entry = readFileSync(here('../mastra/index.ts'), 'utf8')
        expect(entry).toMatch(/^initSentry\(\)$/m)
        expect(entry).not.toMatch(/^import ['"][^'"]*sentry[^'"]*['"]/m)
    })
})
