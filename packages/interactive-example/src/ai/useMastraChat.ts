import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MastraClient } from '@mastra/client-js'
import type { AssistantErrorInfo, UpupConfig } from '../types'
import { applyStepChunk, settleSteps, type ChatStep } from './chatSteps'
import { scrubFailureMessage } from './scrubFailure'

/**
 * Shown inline (as the assistant turn) when the real Mastra agent can't be
 * reached — no canned patches, ever (round-8 item 2). The playground talks only
 * to the real agent; if it's down, say so honestly. Public visitors get a plain
 * line; the setup hint is for a developer running the agent locally.
 */
const AGENT_UNAVAILABLE_HINT =
    'Start the Mastra server with `pnpm run dev` (it boots on http://localhost:4111) and set OPENROUTER_API_KEY in apps/mastra/.env.'
const AGENT_UNAVAILABLE_VISITOR_LINE = 'Please try again in a moment.'

// Inlined by the consumer's bundler; the package carries no node types.
declare const process: { env: { NODE_ENV?: string } }

/** True when the developer hint is meaningful: a local agent or a dev build. */
function showDeveloperHint(baseUrl: string): boolean {
    if (process.env.NODE_ENV === 'development') return true
    try {
        const { hostname } = new URL(baseUrl)
        return hostname === 'localhost' || hostname === '127.0.0.1'
    } catch {
        return false
    }
}

type ChatRole = 'user' | 'assistant'

export type AssistantPatchEvent = {
    patch: Partial<UpupConfig>
    explanation: string
}

export type ChatMessage = {
    id: string
    role: ChatRole
    /** Streaming-friendly text body (assistant turns build up over time). */
    text: string
    /** Patches the assistant emitted in this turn. Each one was already applied. */
    patches?: AssistantPatchEvent[]
    /**
     * Plain-word trail of what the agent did this turn (one step per tool
     * call, keyed by toolCallId). Absent until the first tool call.
     */
    steps?: ChatStep[]
    /** True while the assistant is still streaming this turn. */
    pending?: boolean
    /**
     * True when this assistant turn is the honest "agent unavailable" error
     * (not a real answer). Error turns never get thumbs.
     */
    error?: boolean
    /**
     * The Mastra AI-trace id for this assistant turn, used to correlate a
     * thumbs rating back to the trace in PostHog. Absent when tracing is off.
     */
    traceId?: string
}

type UseMastraChatOptions = {
    baseUrl: string
    agentId: string
    /**
     * Called once per applyConfigPatch tool result. Returns the patch that
     * was applied so the consumer can merge it into ConfigContext.
     */
    onPatch: (event: AssistantPatchEvent) => void
    /** App identifier tagged onto the AI trace metadata (`app_id`). */
    appId?: string
    /**
     * PostHog distinct id of the visitor, forwarded as the trace's `userId`
     * (-> PostHog distinct id) so a later rating groups under the same person.
     */
    distinctId?: string | undefined
    /**
     * Called once for every turn that ends in the visible error state, with
     * the path, agent id and a short reason (never the prompt). Not called
     * for a turn superseded by reset()/unmount. A throwing reporter is
     * swallowed: reporting must never change what the visitor sees.
     */
    onAssistantError?: ((info: AssistantErrorInfo) => void) | undefined
}

/** The stream finished cleanly but the agent produced no usable text. */
class EmptyReplyError extends Error {
    constructor() {
        super('the assistant returned an empty reply')
    }
}

// crypto.randomUUID needs a secure context; getRandomValues does not, so the
// fallback stays cryptographically random on plain-http dev hosts.
export const randomHex = (bytes: number): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b =>
        b.toString(16).padStart(2, '0'),
    ).join('')

const newId = () =>
    'randomUUID' in crypto ? crypto.randomUUID() : `msg-${randomHex(12)}`

/**
 * A 32-hex-character trace id (Mastra accepts 1-32 hex chars for
 * `tracingOptions.traceId`). We assign it client-side so the client
 * deterministically knows the real trace id without depending on the response
 * surfacing one — it is the id the trace is actually recorded under, not a
 * fabricated value.
 */
const newTraceId = () =>
    'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : randomHex(16)

const isPatchTool = (name: unknown) =>
    name === 'apply-config-patch' || name === 'applyConfigPatch'

function errorText(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string' && error) return error
    const message = (error as { message?: unknown } | null)?.message
    return typeof message === 'string' && message ? message : 'Stream error.'
}

/**
 * Minimal chat hook talking directly to a Mastra agent through the client SDK's
 * `stream()` + `processDataStream`. `text-delta` chunks grow the assistant
 * turn as they arrive (the panel's MarkdownMessage only shows the whole units
 * of it), and each config patch is applied the moment its tool result streams
 * in, so the preview updates before the closing sentence lands.
 *
 * Why not @ai-sdk/react useChat or CopilotKit? Mastra's client SDK already
 * speaks the protocol our agent emits; either of those adds another runtime in
 * the middle for no gain here.
 *
 * An in-flight turn is superseded by run id: every chunk checks it, so after
 * `reset()` nothing from the old turn (text or patch) lands in the cleared
 * transcript. `reset()` and unmount also abort the request, which stops the
 * agent spending tokens on an answer nobody will see.
 */
export function useMastraChat({
    baseUrl,
    agentId,
    onPatch,
    appId,
    distinctId,
    onAssistantError,
}: UseMastraChatOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // One conversation id per chat lifecycle, created lazily on first send and
    // rolled over by reset(). It becomes the trace's `$ai_session_id` and the
    // `$ai_session_id` on every thumbs event, so PostHog groups a conversation.
    const [conversationId, setConversationId] = useState<string | null>(null)
    // Monotonic turn id. Every send captures the value it started with; a
    // response only touches state while it is still the current turn, so a
    // reset() (which bumps the id) discards whatever is already in flight.
    const runIdRef = useRef(0)
    const abortRef = useRef<AbortController | null>(null)

    const client = useMemo(() => new MastraClient({ baseUrl }), [baseUrl])

    useEffect(
        () => () => {
            // Supersede the in-flight turn before aborting it, so neither the
            // abort rejection nor a chunk already read off the wire touches
            // state (or applies a patch) after unmount.
            runIdRef.current++
            abortRef.current?.abort()
        },
        [],
    )

    const send = useCallback(
        async (input: string) => {
            const trimmed = input.trim()
            if (!trimmed || isPending) return
            const myRun = ++runIdRef.current
            const isCurrent = () => runIdRef.current === myRun

            setError(null)
            const convId = conversationId ?? newId()
            if (!conversationId) setConversationId(convId)
            const traceId = newTraceId()

            const userMsg: ChatMessage = {
                id: newId(),
                role: 'user',
                text: trimmed,
            }

            const asstId = newId()
            const asstMsg: ChatMessage = {
                id: asstId,
                role: 'assistant',
                text: '',
                pending: true,
            }

            setMessages(prev => [...prev, userMsg, asstMsg])
            setIsPending(true)

            const updateTurn = (fields: Partial<ChatMessage>) =>
                setMessages(prev =>
                    prev.map(m => (m.id === asstId ? { ...m, ...fields } : m)),
                )

            const abort = new AbortController()
            abortRef.current = abort
            // Outside the try so the failure path can settle what was running.
            let steps: ChatStep[] = []

            try {
                // tracingOptions carries the request-scoped correlation the
                // PostHog exporter reads: metadata.userId -> distinct id,
                // metadata.sessionId -> $ai_session_id; the rest is spread onto
                // the $ai_trace properties. traceId pins the trace to our
                // client-known id (1-32 hex) so a rating can reference it.
                const agent = client.getAgent(agentId)
                const distinct = distinctId || 'anonymous'
                const response = await agent.stream(trimmed, {
                    tracingOptions: {
                        traceId,
                        metadata: {
                            userId: distinct,
                            sessionId: convId,
                            posthog_distinct_id: distinct,
                            conversation_id: convId,
                            app_id: appId ?? 'upup',
                            agent_id: agentId,
                        },
                    },
                    abortSignal: abort.signal,
                } as Parameters<typeof agent.stream>[1])

                let text = ''
                // The agent can write text, call a tool, then write more. Each
                // text part has its own id and the parts carry no separator, so
                // the next part would be glued onto the last word of the
                // previous one. A new id, or a tool/end chunk since the last
                // delta, starts a new part; it opens a paragraph unless one is
                // already open.
                let textId: string | null = null
                let partEnded = false
                // Prefer the trace id the server stamps on its chunks; fall
                // back to the one we assigned via tracingOptions.traceId (the
                // trace is recorded under it either way — never a fabricated
                // value).
                let resolvedTraceId = traceId
                let patches: AssistantPatchEvent[] = []
                // The same tool call can be reported more than once. Dedupe
                // by toolCallId so it doesn't produce two "Applied" chips; a
                // genuine second call has its own id and is kept. A result
                // with no id is keyed by its content instead: an identical
                // id-less patch later in the same turn is taken to be the same
                // call reported again (there is nothing else to tell them
                // apart by), while a different patch is always applied.
                const seen = new Set<string>()
                let streamError: string | null = null

                await response.processDataStream({
                    onChunk: chunk => {
                        // Superseded turn: the transcript it belongs to is
                        // gone, so neither its patches nor its text may land.
                        if (!isCurrent() || streamError !== null) return
                        if (typeof chunk.traceId === 'string' && chunk.traceId)
                            resolvedTraceId = chunk.traceId
                        // The trail follows the tool chunks; a repeat of one
                        // already folded in returns the same array, so it
                        // costs no render.
                        if (
                            chunk.type === 'tool-call' ||
                            chunk.type === 'tool-result' ||
                            chunk.type === 'tool-error'
                        ) {
                            const next = applyStepChunk(steps, chunk)
                            if (next !== steps) {
                                steps = next
                                updateTurn({ steps })
                            }
                        }
                        if (
                            chunk.type === 'text-end' ||
                            chunk.type === 'tool-call' ||
                            chunk.type === 'tool-result' ||
                            chunk.type === 'tool-error'
                        )
                            partEnded = true
                        if (chunk.type === 'text-delta') {
                            const { id, text: part } = chunk.payload
                            if (part) {
                                const newId = typeof id === 'string' ? id : null
                                if (
                                    text &&
                                    !text.endsWith('\n') &&
                                    (partEnded ||
                                        (newId !== null && newId !== textId))
                                )
                                    text += '\n\n'
                                if (newId !== null) textId = newId
                                partEnded = false
                                text += part
                                updateTurn({ text })
                            }
                        } else if (chunk.type === 'tool-result') {
                            const { toolCallId, toolName, result, isError } =
                                chunk.payload
                            if (isError || !isPatchTool(toolName)) return
                            const data = result as AssistantPatchEvent | null
                            if (!data?.patch) return
                            const key = toolCallId
                                ? `id:${toolCallId}`
                                : `result:${JSON.stringify(data)}`
                            if (seen.has(key)) return
                            seen.add(key)
                            onPatch(data)
                            patches = [...patches, data]
                            updateTurn({ patches })
                        } else if (chunk.type === 'error') {
                            streamError = errorText(chunk.payload.error)
                        }
                    },
                })

                if (!isCurrent()) return
                if (streamError !== null) throw new Error(streamError)
                // A stream that ends with no text and no error chunk would
                // otherwise land as a blank bubble. A turn that applied a
                // patch is a real answer (the chips are the reply), so only a
                // wholly empty one goes to the error state.
                if (!text.trim() && patches.length === 0)
                    throw new EmptyReplyError()

                updateTurn({
                    text,
                    patches,
                    ...(steps.length > 0 && { steps: settleSteps(steps) }),
                    pending: false,
                    traceId: resolvedTraceId,
                })
            } catch (e: unknown) {
                if (!isCurrent()) return
                const detail = e instanceof Error ? e.message : 'Network error.'
                const friendly = `AI assistant is unavailable (${detail}). ${
                    showDeveloperHint(baseUrl)
                        ? AGENT_UNAVAILABLE_HINT
                        : AGENT_UNAVAILABLE_VISITOR_LINE
                }`
                setError(friendly)
                try {
                    onAssistantError?.({
                        path: 'playground-chat',
                        agentId,
                        ...(e instanceof EmptyReplyError
                            ? { kind: 'empty-reply' as const }
                            : {
                                  kind: 'upstream-error' as const,
                                  // Providers can echo the request back:
                                  // scrub the prompt and key-like tokens,
                                  // then cap.
                                  message: scrubFailureMessage(detail, trimmed),
                              }),
                    })
                } catch {
                    // Reporting must never break the error turn below.
                }
                // Render the honest error AS the assistant turn — never a canned
                // patch (round-8 item 2). Flag it so no thumbs attach to a
                // non-answer. Patches that already streamed in stay listed:
                // they were applied.
                updateTurn({
                    text: friendly,
                    ...(steps.length > 0 && { steps: settleSteps(steps) }),
                    pending: false,
                    error: true,
                })
            } finally {
                // Only the turn that owns the flight may release the gate; a
                // superseded one must not re-enable the composer under a newer
                // request.
                if (isCurrent()) setIsPending(false)
                if (abortRef.current === abort) abortRef.current = null
            }
        },
        [
            agentId,
            appId,
            client,
            conversationId,
            distinctId,
            isPending,
            onAssistantError,
            onPatch,
        ],
    )

    const reset = useCallback(() => {
        // Bumping the run id supersedes any in-flight turn: its remaining
        // chunks find isCurrent() false and are dropped rather than
        // repopulating the cleared transcript. The abort stops the request
        // itself.
        runIdRef.current++
        abortRef.current?.abort()
        abortRef.current = null
        setMessages([])
        setError(null)
        setIsPending(false)
        // A cleared conversation starts a new session on the next send.
        setConversationId(null)
    }, [])

    return { messages, isPending, error, conversationId, send, reset }
}
