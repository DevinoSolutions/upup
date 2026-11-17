type Context = {
    req: {
        method: string
        url: string
        raw: Request
        header: (name: string) => string | undefined
    }
    json: (
        body: { error: string; message?: string },
        status: 400 | 404 | 413 | 415,
    ) => Response
}
type Next = () => Promise<void | Response>

/**
 * Allow-list for what an anonymous visitor may send to this server (T-17955).
 *
 * Mastra hands the JSON body of POST /api/agents/<id>/{generate,stream}
 * straight to the agent, so the request was a control surface, not just a
 * question: a client `role: "system"` message was obeyed, and a top-level
 * `instructions` field REPLACED the server's system prompt (both proven on
 * prod). The same body carries maxSteps, toolChoice, modelSettings,
 * providerOptions, memory, structuredOutput, context, activeTools, ...
 *
 * And that is only one door. Mastra's built-in server ships ~240 write routes
 * (the OpenAI-style `/api/v1/responses`, `/api/a2a/<agent>`, `/api/stored/*`,
 * `/api/datasets`, `/api/memory`, `/api/workflows`, `/api/mcp`, the agent
 * model swap, ...) and several of them run the agent with client-chosen
 * `instructions`, system/developer messages or even a `model`, on the
 * server's API key. We use none of them, so this is default-deny for the
 * WHOLE server (register it on `/*`):
 *
 *   - GET / HEAD / OPTIONS pass untouched (healthz, schema, agent metadata,
 *     CORS preflight). Probed against the real server: no GET route runs the
 *     agent or mutates state, and none returns visitor conversations (the
 *     observability / memory stores stay empty after a chat).
 *   - The only write allowed is `POST /api/agents/<id>/generate` and
 *     `POST /api/agents/<id>/stream`, with no query string. Every other
 *     write, on any path, is 404, so a route Mastra adds later starts closed.
 *   - Those two POSTs must be `application/json`, at most MAX_BODY_BYTES, and
 *     exactly what the two real clients send:
 *       { messages, tracingOptions? }
 *     `messages` is a non-empty string (@mastra/client-js `agent.stream(text)`,
 *     the playground; `agent.generate(text)`, the evals) or an array of
 *     `{ role: 'user' | 'assistant', content: string }` (the docs panel's raw
 *     fetch). `tracingOptions` is the trace correlation the playground sends:
 *     a hex `traceId` and the six string `metadata` keys below.
 *
 * It rejects with 400 instead of stripping: a stripped field would hide a
 * client bug and leave the request meaning something other than what was sent.
 * The 400 body names the offending field only, never echoes a value.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
// A literal agent id (no percent-escapes), so no encoded variant can reach a
// different handler than the one this regex vetted.
const ALLOWED_POST_PATH = /^\/api\/agents\/[A-Za-z0-9_-]+\/(generate|stream)$/
const JSON_CONTENT_TYPE = /^application\/json\s*(;|$)/i

/**
 * Body cap. The docs panel resends the WHOLE thread on every question, so this
 * is sized for a long thread, not a single question: 256 KiB is ~65k tokens of
 * text, far past any docs conversation (50 messages of typical 1-4 KB answers
 * is well under 200 KB), yet small enough that an anonymous caller cannot make
 * the server buffer megabytes before Mastra's own limit applies.
 */
export const MAX_BODY_BYTES = 256 * 1024
/**
 * Thread caps, coherent with the body cap: 50 messages is 25 question/answer
 * turns; 16k characters each fits a long answer with code. Hitting either gets
 * a 400, which the docs panel shows as its generic "Something went wrong
 * answering that. Try again." bubble (and again on every later send until the
 * panel is cleared, since the thread only grows). Together the two could
 * exceed MAX_BODY_BYTES; the byte cap is what bounds the request.
 */
export const MAX_MESSAGES = 50
export const MAX_MESSAGE_CHARS = 16_000

const BODY_KEYS = new Set(['messages', 'tracingOptions'])
const MESSAGE_KEYS = new Set(['role', 'content'])
const CLIENT_ROLES = new Set(['user', 'assistant'])
const TRACING_KEYS = new Set(['traceId', 'metadata'])
// useMastraChat's `newTraceId()`: a UUID without dashes, or 16 random bytes as
// hex. Mastra itself accepts 1-32 hex characters.
const TRACE_ID = /^[0-9a-f]{1,32}$/
// Exactly the metadata useMastraChat sends. @mastra/posthog spreads metadata
// LAST into the PostHog event, so an open key set would let a client overwrite
// `$ai_*` properties.
const METADATA_KEYS = new Set([
    'userId',
    'sessionId',
    'posthog_distinct_id',
    'conversation_id',
    'app_id',
    'agent_id',
])
const MAX_METADATA_VALUE_CHARS = 200

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

function problemWithTracing(tracing: unknown): string | undefined {
    const message = 'tracingOptions may only carry traceId and metadata.'
    if (
        !isPlainObject(tracing) ||
        strayKey(tracing, TRACING_KEYS) !== undefined
    )
        return message
    const { traceId, metadata } = tracing
    if (
        traceId !== undefined &&
        (typeof traceId !== 'string' || !TRACE_ID.test(traceId))
    )
        return 'tracingOptions.traceId must be 1-32 lowercase hex characters.'
    if (metadata === undefined) return undefined
    if (
        !isPlainObject(metadata) ||
        strayKey(metadata, METADATA_KEYS) !== undefined
    )
        return `tracingOptions.metadata may only carry ${[...METADATA_KEYS].join(', ')}.`
    for (const value of Object.values(metadata)) {
        if (
            typeof value !== 'string' ||
            value.length > MAX_METADATA_VALUE_CHARS
        )
            return `tracingOptions.metadata values must be strings of at most ${MAX_METADATA_VALUE_CHARS} characters.`
    }
    return undefined
}

/** Why `body` is not an allowed chat request, or undefined when it is. */
function problemWith(body: unknown): string | undefined {
    if (!isPlainObject(body)) return 'The body must be a JSON object.'
    const stray = strayKey(body, BODY_KEYS)
    if (stray !== undefined) return `Unsupported field: ${stray.slice(0, 40)}`

    const { messages, tracingOptions } = body
    if (typeof messages === 'string') {
        if (!messages) return 'messages must not be empty.'
        if (messages.length > MAX_MESSAGE_CHARS)
            return `A message may be at most ${MAX_MESSAGE_CHARS} characters.`
    } else if (Array.isArray(messages)) {
        if (messages.length === 0) return 'messages must not be empty.'
        if (messages.length > MAX_MESSAGES)
            return `A thread may hold at most ${MAX_MESSAGES} messages.`
        for (const message of messages) {
            if (
                !isPlainObject(message) ||
                strayKey(message, MESSAGE_KEYS) !== undefined ||
                typeof message.content !== 'string' ||
                typeof message.role !== 'string' ||
                !CLIENT_ROLES.has(message.role)
            )
                return 'Each message must be { role: "user" | "assistant", content: string }.'
            if (message.content.length > MAX_MESSAGE_CHARS)
                return `A message may be at most ${MAX_MESSAGE_CHARS} characters.`
        }
    } else {
        return 'messages must be a string or an array of messages.'
    }

    return tracingOptions === undefined
        ? undefined
        : problemWithTracing(tracingOptions)
}

/**
 * The body as text, or undefined once it passes MAX_BODY_BYTES. Reads a clone
 * (Mastra's own handler still gets an unread body) and stops pulling at the
 * cap, so a chunked or lying-content-length body is never buffered whole.
 */
async function readCapped(raw: Request): Promise<string | undefined> {
    const stream = raw.clone().body
    if (!stream) return ''
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BODY_BYTES) {
            // Not awaited: cancelling one tee branch settles only once the
            // other (Mastra's, unread) is cancelled too, which would hang here.
            reader.cancel().catch(() => {})
            return undefined
        }
        chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
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
        if (!JSON_CONTENT_TYPE.test(c.req.header('content-type') ?? ''))
            return c.json(
                {
                    error: 'unsupported_media_type',
                    message: 'Send application/json.',
                },
                415,
            )

        const tooLarge = () =>
            c.json(
                {
                    error: 'payload_too_large',
                    message: `The body may be at most ${MAX_BODY_BYTES} bytes.`,
                },
                413,
            )
        if (Number(c.req.header('content-length')) > MAX_BODY_BYTES)
            return tooLarge()
        const text = await readCapped(c.req.raw)
        if (text === undefined) return tooLarge()

        let body: unknown
        try {
            body = JSON.parse(text)
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
