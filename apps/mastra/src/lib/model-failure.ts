import * as Sentry from '@sentry/node'
import { env } from './env.js'

/** The HTTP status the AI SDK recorded on the failed model call, if one is on the error chain. */
export function upstreamStatus(error: unknown): number | undefined {
    let current = error
    for (
        let depth = 0;
        depth < 4 && typeof current === 'object' && current !== null;
        depth++
    ) {
        const { statusCode, cause } = current as {
            statusCode?: unknown
            cause?: unknown
        }
        if (typeof statusCode === 'number') return statusCode
        current = cause
    }
    return undefined
}

/** A provider's one-line reason ("No endpoints found for …") is useful; anything longer is not ours to ship. */
const REASON_LIMIT = 200

/**
 * An agent's model call failed: a retired model id (404), a bad key (401), the
 * Devino proxy or OpenRouter down, a timeout. Mastra's `onError` stream hook is
 * where that arrives; before it was set, the failure was a mastra console line
 * and nothing else, so the playground or docs chat could fail every turn with
 * no Sentry event (T-7047).
 *
 * What is sent: a FRESH Error naming the agent, the model id, the status and
 * the provider's one-line reason. Never the AI SDK error object itself, which
 * carries requestBodyValues (the visitor's prompt), the response body and the
 * response headers.
 */
export function modelFailureEvent(agent: string, error: unknown): Error {
    const status = upstreamStatus(error)
    const raw = error instanceof Error ? error.message : String(error)
    const reason = raw.slice(0, REASON_LIMIT)
    const e = new Error(
        `${agent} model call failed${status === undefined ? '' : ` with HTTP ${status}`} on ${env.OPENROUTER_MODEL}: ${reason}`,
    )
    e.name = 'AgentModelFailure'
    return e
}

/** An `onError` for an agent's defaultOptions. */
export function reportModelFailure(agent: string) {
    return ({ error }: { error: unknown }): void => {
        const event = modelFailureEvent(agent, error)
        console.error(`[${agent}] ${event.message}`)
        Sentry.captureException(event, {
            tags: {
                agent,
                model: env.OPENROUTER_MODEL,
                upstream_status: String(upstreamStatus(error) ?? 'none'),
            },
        })
    }
}
