'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clientEnv } from '@/lib/client/env'
import { reportAiFailure, type AiFailureReport } from '@/lib/analytics/sentry'
import {
    applyStepChunk,
    settleSteps,
    type ChatStep,
} from '@useupup/interactive-example/ai/chatSteps'
import { scrubFailureMessage } from '@useupup/interactive-example/ai/scrubFailure'

const DOCS_AGENT_ID = 'docs-agent'

/**
 * Limits of the Mastra server's client-input guard
 * (apps/mastra/src/mastra/middleware/client-input-guard.ts): a chat body with
 * more than 50 messages, any message (assistant replies included) over 16,000
 * characters, or a body over 262,144 bytes, is refused with HTTP 400/413. The
 * docs panel sends only the most recent messages (the UI still shows the whole
 * thread), clips each to the per-message cap, and drops the oldest until the
 * body fits a byte budget with headroom, so a long conversation always passes.
 * It also caps the composer at the per-message limit. Keep the window well
 * under the server's 50.
 */
export const DOCS_CHAT_MAX_MESSAGES = 20
export const DOCS_CHAT_MAX_MESSAGE_CHARS = 16_000
export const DOCS_CHAT_MAX_BODY_BYTES = 240 * 1024

type WireMessage = { role: DocsChatMessage['role']; content: string }

/**
 * The request messages for a turn: error bubbles out (UI-only), each message
 * clipped to the per-message cap, the last DOCS_CHAT_MAX_MESSAGES kept, then
 * the oldest dropped until the serialised body fits DOCS_CHAT_MAX_BODY_BYTES
 * (the newest message always stays), and any leading assistant turns dropped
 * so the thread starts on a user turn.
 */
function buildWireMessages(history: DocsChatMessage[]): WireMessage[] {
    const wire: WireMessage[] = history
        .filter(m => !m.error)
        .map(m => ({
            role: m.role,
            content: m.content.slice(0, DOCS_CHAT_MAX_MESSAGE_CHARS),
        }))
        .slice(-DOCS_CHAT_MAX_MESSAGES)
    const encoder = new TextEncoder()
    const bodyBytes = () =>
        encoder.encode(JSON.stringify({ messages: wire })).length
    while (wire.length > 1 && bodyBytes() > DOCS_CHAT_MAX_BODY_BYTES)
        wire.shift()
    while (wire.length > 1 && wire[0]!.role === 'assistant') wire.shift()
    return wire
}

const GENERIC_FAILURE = 'Something went wrong answering that. Try again.'

/**
 * True for the 503 body mastra's daily-budget middleware sends
 * (apps/mastra/src/mastra/middleware/daily-budget.ts: "Daily request budget
 * reached. ..."). Any other 503 (a proxy, a redeploy) is not the daily limit.
 */
function isDailyBudgetBody(body: unknown): boolean {
    const error = (body as { error?: unknown } | null | undefined)?.error
    return typeof error === 'string' && error.startsWith('Daily request budget')
}

/**
 * What the visitor is told when the server deliberately refuses the request:
 * 429 is the rate limit, 503 WITH the daily-budget body the daily limit,
 * 400/413 an over-long message. Fixed copy per status, never the server's
 * text. Null means "not a refusal we have wording for" and the generic bubble
 * stays.
 */
function refusalMessage(
    status: number | null,
    dailyBudget: boolean,
): string | null {
    switch (status) {
        case 429:
            return 'Too many messages in a short time. Wait a moment, then try again.'
        case 503:
            return dailyBudget
                ? 'The assistant has hit its daily limit. Try again tomorrow.'
                : null
        case 400:
        case 413:
            return 'That message is too long. Shorten it, or clear the conversation and start a new chat.'
        default:
            return null
    }
}

/**
 * Whether a stream refusal ends the turn without a second request to
 * /generate. Only the deliberate refusals we have wording for (400/413 guard,
 * 429 rate limit, daily-budget 503) are answers about the REQUEST that
 * /generate would repeat, so those fail fast. Everything else still falls
 * back: a network error, any 5xx including a plain 503, an empty stream, an
 * error chunk, and any other 4xx (a 404 means the stream route is missing on
 * that server, which is exactly what the /generate fallback is for).
 */
function refusedByServer(status: number | null, dailyBudget: boolean): boolean {
    return refusalMessage(status, dailyBudget) !== null
}

/** Why a `/generate` attempt produced no answer. */
type GenerateOutcome =
    | { ok: true }
    | { ok: false; kind: 'upstream-error' | 'empty-reply'; message?: string }

export interface DocsChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    error?: boolean
    /** True while an assistant turn is still receiving streamed tokens. */
    streaming?: boolean
    /**
     * Plain-word trail of what the agent did this turn (see chatSteps in
     * @useupup/interactive-example; never raw tool names, args or results).
     */
    steps?: ChatStep[]
}

// Deliberate slim duplicate of the interactive-example transport: that hook
// (packages/interactive-example/src/ai/useMastraChat.ts) is coupled to config
// patching and the Mastra client SDK. The docs panel only needs plain
// question→answer over the same `/api/agents/<id>/…` shape (request body
// `{ messages: [{ role, content }] }`), so it talks to the endpoint with plain
// fetch and no extra dependency.
//
// Primary path is the streaming endpoint `/api/agents/docs-agent/stream`; the
// non-streaming `/generate` endpoint (answer in `response.text`) is the
// fallback when the stream can't be opened or yields nothing.

// Observed stream wire format (mastra 1.x agent `/stream`, verified live against
// the local server 2026-07-22): `Content-Type: text/event-stream`, one SSE event
// per `data: {json}\n\n`. Events are AI-SDK-style records tagged by `type`:
//   data: {"type":"start", ...}
//   data: {"type":"step-start", ...}
//   data: {"type":"tool-call-input-streaming-start", ...}
//   data: {"type":"tool-call-delta", "payload":{"argsTextDelta":"…"}}
//   data: {"type":"tool-call", "payload":{"toolCallId":"…","toolName":"…","args":{…}}}
//   data: {"type":"tool-result", "payload":{"toolCallId":"…","toolName":"…","result":{…}}}
//   data: {"type":"text-start", "payload":{"id":"…"}}
//   data: {"type":"text-delta", "payload":{"id":"…","text":" enable"}}   ← answer tokens
//   data: {"type":"text-end", ...}   /   data: {"type":"finish", ...}
// `text-delta` events carry answer text (in `payload.text`); the `tool-*` events
// feed the step trail (chatSteps words them; nothing raw is kept for display);
// step/lifecycle markers are ignored. A single network read may contain several
// events or a partial one, so we buffer and split on the blank-line SSE
// delimiter.
interface StreamChunk {
    type: string
    payload?: unknown
}

/** The message of a stream `error` chunk (`payload.error`: string or {message}). */
function errorChunkMessage(payload: unknown): string {
    const error = (payload as { error?: unknown } | null | undefined)?.error
    if (typeof error === 'string' && error) return error
    const message = (error as { message?: unknown } | null | undefined)?.message
    return typeof message === 'string' && message ? message : 'stream error'
}

function parseStreamChunks(eventBlock: string): StreamChunk[] {
    const out: StreamChunk[] = []
    for (const line of eventBlock.split('\n')) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
            const evt = JSON.parse(data)
            if (typeof evt?.type === 'string')
                out.push({ type: evt.type, payload: evt.payload })
        } catch {
            // Partial/malformed JSON — the buffering split guarantees we only
            // hand whole `data:` events here, so this is a genuinely bad line;
            // skip it rather than aborting the whole stream.
        }
    }
    return out
}

export function useDocsChat() {
    const [messages, setMessages] = useState<DocsChatMessage[]>([])
    const [pending, setPending] = useState(false)
    const counter = useRef(0)
    const abortRef = useRef<AbortController | null>(null)
    // `pending` is render state: two submits in the same tick (Enter plus a
    // click, a double-tap) both read the pre-update `false` and fire two
    // requests against one transcript. The ref flips synchronously, so the
    // second call sees the first already in flight.
    const inFlightRef = useRef(false)
    // Monotonic run id. A send releases the shared gate only while it still
    // OWNS it: clear() drops the gate so a new send can start, and without this
    // the older request's teardown would then clear the newer one's pending
    // state mid-answer (re-enabling the composer and allowing a third request).
    const runIdRef = useRef(0)

    // Leaving /docs mid-answer should not keep a request alive writing into a
    // hook nobody is rendering.
    useEffect(
        () => () => {
            runIdRef.current++
            abortRef.current?.abort()
        },
        [],
    )

    const send = useCallback(
        async (content: string) => {
            const base = clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL
            if (!base || pending || inFlightRef.current) return
            inFlightRef.current = true
            const myRun = ++runIdRef.current
            const isCurrent = () => runIdRef.current === myRun

            const userMsg: DocsChatMessage = {
                id: `m${++counter.current}`,
                role: 'user',
                content,
            }
            const assistantId = `m${++counter.current}`
            const history = [...messages, userMsg]
            // The turn's step trail, folded from tool chunks as they stream.
            let steps: ChatStep[] = []
            // Insert the user turn plus an empty streaming assistant placeholder
            // so the panel can render the answer bubble (with its pulsing cursor)
            // the instant tokens start arriving.
            setMessages([
                ...history,
                {
                    id: assistantId,
                    role: 'assistant',
                    content: '',
                    streaming: true,
                },
            ])
            setPending(true)

            // Error bubbles are UI-only — replaying "Something went wrong" to the
            // agent as a real assistant turn degrades every follow-up after a
            // failure, so they're filtered out of the wire payload.
            const wireMessages = buildWireMessages(history)

            const controller = new AbortController()
            abortRef.current = controller

            const setAssistant = (patch: Partial<DocsChatMessage>) =>
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId ? { ...m, ...patch } : m,
                    ),
                )

            const finishError = (content = GENERIC_FAILURE) =>
                setAssistant({
                    content,
                    error: true,
                    streaming: false,
                    steps: settleSteps(steps),
                })

            // A tab close or navigation makes the in-flight fetch reject
            // ("Failed to fetch") while the run is still current; that is the
            // visitor leaving, not a failure. (document.visibilityState is NOT
            // used: a backgrounded tab with a real outage must still report.)
            let unloading = false
            const onPageHide = () => {
                unloading = true
            }
            if (typeof window !== 'undefined')
                window.addEventListener('pagehide', onPageHide)

            // One Sentry event per failure; a turn the visitor cleared (or that
            // was aborted by unmount) is not a failure worth reporting.
            const report = (
                kind: AiFailureReport['kind'],
                message?: string,
            ) => {
                if (unloading || !isCurrent() || controller.signal.aborted)
                    return
                // The provider can echo the request back: scrub the prompt and
                // key-like tokens before the reason leaves the page.
                const reason = message
                    ? scrubFailureMessage(message, content)
                    : ''
                reportAiFailure({
                    path: 'docs-ask-ai',
                    agentId: DOCS_AGENT_ID,
                    kind,
                    ...(reason ? { message: reason } : {}),
                })
            }

            // Non-streaming fallback: the original `/generate` round-trip.
            const runGenerate = async (): Promise<GenerateOutcome> => {
                try {
                    const res = await fetch(
                        `${base}/api/agents/${DOCS_AGENT_ID}/generate`,
                        {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ messages: wireMessages }),
                            signal: controller.signal,
                        },
                    )
                    if (!res.ok)
                        return {
                            ok: false,
                            kind: 'upstream-error',
                            message: `generate HTTP ${res.status}`,
                        }
                    const data = await res.json()
                    const text = typeof data.text === 'string' ? data.text : ''
                    if (!text.trim()) return { ok: false, kind: 'empty-reply' }
                    setAssistant({
                        content: text,
                        streaming: false,
                        steps: settleSteps(steps),
                    })
                    return { ok: true }
                } catch (e: unknown) {
                    return {
                        ok: false,
                        kind: 'upstream-error',
                        message:
                            e instanceof Error ? e.message : 'fetch failed',
                    }
                }
            }

            try {
                let streamed = ''
                let opened = false
                // Why the stream path failed, kept so the failure is reported
                // even when the answer is rescued below.
                let streamFailure: string | null = null
                // HTTP status of a refused stream request (null when it was
                // never refused: network error, or a 200 stream).
                let streamStatus: number | null = null
                // True when that refusal was the daily-budget 503.
                let streamDailyBudget = false
                // Mastra reports an upstream failure as an `error` chunk inside
                // an HTTP 200 stream. Whatever text arrived before it is a cut-off
                // answer, not a finished one, so it must not pass as complete.
                let streamErrored = false
                // Text parts are separate: the agent writes some text, calls a
                // tool, then writes more. Each part gets its own id and the
                // parts carry no separator, so the next part's first token is
                // joined to the previous part's last (`…validation:Perfect!`).
                // A new id, or a tool/end marker since the last delta, starts a
                // new part; it opens a paragraph unless one is already open.
                let textId: string | null = null
                let partEnded = false
                // Fold one whole SSE event into the answer text and the trail,
                // writing to state once per event.
                const consume = (eventBlock: string) => {
                    let changed = false
                    for (const chunk of parseStreamChunks(eventBlock)) {
                        if (chunk.type === 'error') {
                            streamErrored = true
                            streamFailure ??= errorChunkMessage(chunk.payload)
                            continue
                        }
                        if (chunk.type === 'text-delta') {
                            const { id, text } = (chunk.payload ?? {}) as {
                                id?: unknown
                                text?: unknown
                            }
                            if (typeof text === 'string' && text) {
                                const newId = typeof id === 'string' ? id : null
                                if (
                                    streamed &&
                                    !streamed.endsWith('\n') &&
                                    (partEnded ||
                                        (newId !== null && newId !== textId))
                                )
                                    streamed += '\n\n'
                                if (newId !== null) textId = newId
                                partEnded = false
                                streamed += text
                                changed = true
                            }
                            continue
                        }
                        if (
                            chunk.type === 'text-end' ||
                            chunk.type === 'tool-call' ||
                            chunk.type === 'tool-result' ||
                            chunk.type === 'tool-error'
                        )
                            partEnded = true
                        const next = applyStepChunk(steps, chunk)
                        if (next !== steps) {
                            steps = next
                            changed = true
                        }
                    }
                    if (changed) setAssistant({ content: streamed, steps })
                }
                try {
                    const res = await fetch(
                        `${base}/api/agents/docs-agent/stream`,
                        {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ messages: wireMessages }),
                            signal: controller.signal,
                        },
                    )
                    if (!res.ok || !res.body)
                        streamFailure = `stream HTTP ${res.status}`
                    if (!res.ok) {
                        streamStatus = res.status
                        if (res.status === 503)
                            streamDailyBudget = isDailyBudgetBody(
                                await res
                                    .clone()
                                    .json()
                                    .catch(() => null),
                            )
                    }
                    if (res.ok && res.body) {
                        opened = true
                        const reader = res.body.getReader()
                        const decoder = new TextDecoder()
                        let buffer = ''
                        // Buffer bytes and process only whole SSE events
                        // (blank-line delimited), appending each text token as
                        // it arrives.
                        for (;;) {
                            const { done, value } = await reader.read()
                            if (done) break
                            buffer += decoder.decode(value, { stream: true })
                            // A well-formed SSE event is tiny; a buffer that
                            // grows past 1 MB without a blank-line delimiter
                            // means a misbehaving backend — abort rather than
                            // grow unbounded (throw lands in the catch below,
                            // keeping any already-streamed partial).
                            if (buffer.length > 1_000_000) {
                                reader.cancel().catch(() => {})
                                throw new Error('sse buffer overflow')
                            }
                            let sep: number
                            while ((sep = buffer.indexOf('\n\n')) !== -1) {
                                const evt = buffer.slice(0, sep)
                                buffer = buffer.slice(sep + 2)
                                consume(evt)
                            }
                        }
                        // Flush any trailing event without a closing blank line.
                        consume(buffer)
                    }
                } catch (e: unknown) {
                    // Fall through to the fallback decision below, but keep the
                    // reason: the visitor may never see this failure.
                    streamFailure ??=
                        e instanceof Error ? e.message : 'stream failed'
                }

                if (streamed.trim() && !streamErrored) {
                    // Got real tokens — finalize with what streamed, even if the
                    // transport later hiccuped; the answer is already useful. A
                    // stream that ended on an error chunk is the exception: it
                    // falls through to /generate below.
                    setAssistant({
                        content: streamed,
                        streaming: false,
                        steps: settleSteps(steps),
                    })
                    if (streamFailure !== null)
                        report('stream-failed', streamFailure)
                } else if (refusedByServer(streamStatus, streamDailyBudget)) {
                    // The server refused the request itself (guard, rate
                    // limit, daily budget): /generate would get the same
                    // answer, so end the turn with the specific message and
                    // send nothing more.
                    finishError(
                        refusalMessage(streamStatus, streamDailyBudget) ??
                            GENERIC_FAILURE,
                    )
                    report('upstream-error', streamFailure ?? undefined)
                } else {
                    // Stream never opened (network / 5xx), opened but
                    // produced no text, or ended on an error chunk — fall back
                    // to /generate.
                    if (opened && streamFailure === null)
                        streamFailure = 'empty stream'
                    const generated = await runGenerate()
                    if (generated.ok) {
                        if (streamFailure !== null)
                            report('stream-failed', streamFailure)
                    } else {
                        finishError()
                        // The turn ended in the error bubble: ONE event, with
                        // the stream reason folded in.
                        const reason = [generated.message, streamFailure]
                            .filter(Boolean)
                            .join('; ')
                        report(generated.kind, reason || undefined)
                    }
                }
            } finally {
                if (typeof window !== 'undefined')
                    window.removeEventListener('pagehide', onPageHide)
                // Release the shared gate only if this send still owns it.
                if (isCurrent()) {
                    inFlightRef.current = false
                    setPending(false)
                    abortRef.current = null
                }
            }
        },
        [messages, pending],
    )

    const clear = useCallback(() => {
        // Bump first: any in-flight send is now superseded, so when it unwinds
        // it leaves the gate alone for whatever the user starts next.
        runIdRef.current++
        abortRef.current?.abort()
        abortRef.current = null
        inFlightRef.current = false
        setMessages([])
        setPending(false)
    }, [])

    return { messages, pending, send, clear }
}
