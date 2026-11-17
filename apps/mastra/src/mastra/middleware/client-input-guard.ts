type Context = {
    req: { method: string; url: string; raw: Request }
    json: (
        body: { error: string; message?: string },
        status: 400 | 404,
    ) => Response
}
type Next = () => Promise<void | Response>

/**
 * Allow-list for what an anonymous visitor may send to the agents (T-17955).
 *
 * Mastra hands the JSON body of POST /api/agents/<id>/{generate,stream}
 * straight to the agent, so the request was a control surface, not just a
 * question: a client `role: "system"` message was obeyed, and a top-level
 * `instructions` field REPLACED the server's system prompt (both proven on
 * prod). The same body also carries maxSteps, toolChoice, modelSettings,
 * providerOptions, memory, structuredOutput, context, activeTools, ... and
 * Mastra serves more POST routes under /api/agents/<id>/ (model swap,
 * instructions/enhance, the legacy/ui/network variants) that reach the agent
 * the same way. None of that should be client-controllable here, so this is
 * default-deny:
 *
 *   - GET / HEAD / OPTIONS pass untouched (agent metadata, CORS preflight).
 *   - The only POSTs allowed are `<id>/generate` and `<id>/stream`, with no
 *     query string. Any other write is 404, so a route Mastra adds later
 *     starts closed instead of open.
 *   - The body must be exactly what the two real clients send:
 *       { messages, tracingOptions? }
 *     `messages` is a non-empty string (@mastra/client-js `agent.stream(text)`,
 *     the playground) or an array of `{ role: 'user' | 'assistant',
 *     content: string }` (the docs panel's raw fetch). `tracingOptions` is the
 *     trace correlation the playground sends, limited to `traceId` + `metadata`.
 *
 * It rejects with 400 instead of stripping: a stripped field would hide a
 * client bug and leave the request meaning something other than what was sent.
 * The 400 body names the offending field only, never echoes a value.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const ALLOWED_POST_PATH = /^\/api\/agents\/[^/]+\/(generate|stream)$/

const BODY_KEYS = new Set(['messages', 'tracingOptions'])
const MESSAGE_KEYS = new Set(['role', 'content'])
const CLIENT_ROLES = new Set(['user', 'assistant'])
const TRACING_KEYS = new Set(['traceId', 'metadata'])

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The first key outside `allowed` (own keys, so `__proto__` counts), if any. */
function strayKey(
    value: Record<string, unknown>,
    allowed: Set<string>,
): string | undefined {
    return Object.keys(value).find(key => !allowed.has(key))
}

/** Why `body` is not an allowed chat request, or undefined when it is. */
function problemWith(body: unknown): string | undefined {
    if (!isPlainObject(body)) return 'The body must be a JSON object.'
    const stray = strayKey(body, BODY_KEYS)
    if (stray !== undefined) return `Unsupported field: ${stray.slice(0, 40)}`

    const { messages, tracingOptions } = body
    if (typeof messages === 'string') {
        if (!messages) return 'messages must not be empty.'
    } else if (Array.isArray(messages)) {
        if (messages.length === 0) return 'messages must not be empty.'
        for (const message of messages) {
            if (
                !isPlainObject(message) ||
                strayKey(message, MESSAGE_KEYS) !== undefined ||
                typeof message.content !== 'string' ||
                typeof message.role !== 'string' ||
                !CLIENT_ROLES.has(message.role)
            )
                return 'Each message must be { role: "user" | "assistant", content: string }.'
        }
    } else {
        return 'messages must be a string or an array of messages.'
    }

    if (tracingOptions !== undefined) {
        if (
            !isPlainObject(tracingOptions) ||
            strayKey(tracingOptions, TRACING_KEYS) !== undefined ||
            (tracingOptions.traceId !== undefined &&
                typeof tracingOptions.traceId !== 'string') ||
            (tracingOptions.metadata !== undefined &&
                !isPlainObject(tracingOptions.metadata))
        )
            return 'tracingOptions may only carry traceId and metadata.'
    }
    return undefined
}

export function clientInputGuard() {
    return async (c: Context, next: Next) => {
        if (SAFE_METHODS.has(c.req.method)) return next()

        const url = new URL(c.req.url)
        if (c.req.method !== 'POST' || !ALLOWED_POST_PATH.test(url.pathname))
            return c.json({ error: 'not_found' }, 404)
        if (url.search)
            return c.json(
                { error: 'invalid_request', message: 'No query string.' },
                400,
            )

        let body: unknown
        try {
            // clone(): leave the original body unread for Mastra's own handler.
            body = JSON.parse(await c.req.raw.clone().text())
        } catch {
            return c.json(
                {
                    error: 'invalid_request',
                    message: 'Body is not valid JSON.',
                },
                400,
            )
        }
        const problem = problemWith(body)
        if (problem)
            return c.json({ error: 'invalid_request', message: problem }, 400)

        return next()
    }
}
