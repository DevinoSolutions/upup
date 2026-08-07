import { useCallback, useMemo, useRef, useState } from 'react'
import { MastraClient } from '@mastra/client-js'
import type { UpupConfig } from '../types'

/**
 * Shown inline (as the assistant turn) when the real Mastra agent can't be
 * reached — no canned patches, ever (round-8 item 2). The playground talks only
 * to the real agent; if it's down, say so honestly and tell the user how to
 * bring it up.
 */
const AGENT_UNAVAILABLE_HINT =
    'Start the Mastra server with `pnpm run dev` (it boots on http://localhost:4111) and set OPENROUTER_API_KEY in apps/mastra/.env.'

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

/**
 * Minimal chat hook talking directly to a Mastra agent through the client SDK's
 * `generate()` — a whole turn per request, NOT token streaming. The panel shows
 * a pending cursor while the request is in flight, then renders the answer in
 * one go.
 *
 * Why not @ai-sdk/react useChat or CopilotKit? Mastra's client SDK already
 * speaks the protocol our agent emits; either of those adds another runtime in
 * the middle for no gain here.
 *
 * There is deliberately no cancel: `@mastra/client-js` builds `generate()`'s
 * options by Omit-ing `abortSignal` (see StreamParamsBase in its types), so a
 * request cannot be aborted through the SDK. Rather than expose a cancel that
 * silently does nothing, an in-flight turn is superseded by run id — after
 * `reset()` a late response is discarded instead of landing in a cleared
 * transcript.
 */
export function useMastraChat({
    baseUrl,
    agentId,
    onPatch,
    appId,
    distinctId,
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

    const client = useMemo(() => new MastraClient({ baseUrl }), [baseUrl])

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

            try {
                // .generate() returns the whole turn at once. We trade
                // token-streaming for fewer moving parts and a simpler
                // tool-result hand-off. The Mastra response shape we rely on
                // here was verified end-to-end during Phase 1 smoke tests.
                //
                // tracingOptions carries the request-scoped correlation the
                // PostHog exporter reads: metadata.userId -> distinct id,
                // metadata.sessionId -> $ai_session_id; the rest is spread onto
                // the $ai_trace properties. traceId pins the trace to our
                // client-known id (1-32 hex) so a rating can reference it.
                const agent = client.getAgent(agentId)
                const distinct = distinctId || 'anonymous'
                const response: any = await agent.generate(trimmed, {
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
                } as Parameters<typeof agent.generate>[1])

                const text: string = response?.text ?? ''
                // Prefer the trace id the server reports; fall back to the one
                // we assigned via tracingOptions.traceId (the trace is recorded
                // under it either way — never a fabricated value).
                const resolvedTraceId: string =
                    typeof response?.traceId === 'string' && response.traceId
                        ? response.traceId
                        : traceId
                const patches: AssistantPatchEvent[] = []

                // Mastra reports the same tool result in two places —
                // response.toolResults (top-level) AND response.steps[i].toolResults.
                // Dedupe by toolCallId so a single agent call doesn't produce
                // two "Applied" chips. If the agent genuinely called the tool
                // more than once in a turn, distinct toolCallIds preserve each.
                const seen = new Set<string>()
                const collect = (results: any[] | undefined) => {
                    if (!Array.isArray(results)) return
                    for (const r of results) {
                        const id: string | undefined =
                            r?.toolCallId ?? r?.payload?.toolCallId
                        if (id && seen.has(id)) continue
                        const name = r?.toolName ?? r?.payload?.toolName
                        if (
                            name !== 'apply-config-patch' &&
                            name !== 'applyConfigPatch'
                        )
                            continue
                        const data = r?.result ?? r?.payload?.result
                        if (!data?.patch) continue
                        if (id) seen.add(id)
                        patches.push(data as AssistantPatchEvent)
                    }
                }
                collect(response?.toolResults)
                if (Array.isArray(response?.steps)) {
                    for (const step of response.steps)
                        collect(step?.toolResults)
                }

                // Superseded turn: the transcript it belongs to is gone, so
                // neither its patches nor its text may be applied.
                if (!isCurrent()) return

                for (const p of patches) onPatch(p)

                setMessages(prev =>
                    prev.map(m =>
                        m.id === asstId
                            ? {
                                  ...m,
                                  text,
                                  patches,
                                  pending: false,
                                  traceId: resolvedTraceId,
                              }
                            : m,
                    ),
                )
            } catch (e: unknown) {
                if (!isCurrent()) return
                const detail = e instanceof Error ? e.message : 'Network error.'
                const friendly = `AI assistant is unavailable (${detail}). ${AGENT_UNAVAILABLE_HINT}`
                setError(friendly)
                // Render the honest error AS the assistant turn — never a canned
                // patch (round-8 item 2). Flag it so no thumbs attach to a
                // non-answer.
                setMessages(prev =>
                    prev.map(m =>
                        m.id === asstId
                            ? {
                                  ...m,
                                  text: friendly,
                                  pending: false,
                                  error: true,
                              }
                            : m,
                    ),
                )
            } finally {
                // Only the turn that owns the flight may release the gate; a
                // superseded one must not re-enable the composer under a newer
                // request.
                if (isCurrent()) setIsPending(false)
            }
        },
        [
            agentId,
            appId,
            client,
            conversationId,
            distinctId,
            isPending,
            onPatch,
        ],
    )

    const reset = useCallback(() => {
        // Bumping the run id supersedes any in-flight turn: its response finds
        // isCurrent() false and is dropped rather than repopulating the cleared
        // transcript. The request itself keeps running — the SDK gives us no
        // way to abort it — but it can no longer affect the UI.
        runIdRef.current++
        setMessages([])
        setError(null)
        setIsPending(false)
        // A cleared conversation starts a new session on the next send.
        setConversationId(null)
    }, [])

    return { messages, isPending, error, conversationId, send, reset }
}
