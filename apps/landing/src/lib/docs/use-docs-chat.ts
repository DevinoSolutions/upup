'use client'

import { useCallback, useRef, useState } from 'react'
import { clientEnv } from '@/lib/env'

export interface DocsChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    error?: boolean
    /** True while an assistant turn is still receiving streamed tokens. */
    streaming?: boolean
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
//   data: {"type":"tool-call", ...}
//   data: {"type":"tool-result", "payload":{"result":{…}}}
//   data: {"type":"text-start", "payload":{"id":"…"}}
//   data: {"type":"text-delta", "payload":{"id":"…","text":" enable"}}   ← answer tokens
//   data: {"type":"text-end", ...}   /   data: {"type":"finish", ...}
// Only `text-delta` events carry answer text (in `payload.text`); everything
// else — tool calls, step/lifecycle markers — is ignored. A single network read
// may contain several events or a partial one, so we buffer and split on the
// blank-line SSE delimiter.
function extractTextDeltas(eventBlock: string): string {
    let out = ''
    for (const line of eventBlock.split('\n')) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
            const evt = JSON.parse(data)
            if (evt?.type === 'text-delta') {
                const text = evt?.payload?.text
                if (typeof text === 'string') out += text
            }
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

    const send = useCallback(
        async (content: string) => {
            const base = clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL
            if (!base || pending) return

            const userMsg: DocsChatMessage = {
                id: `m${++counter.current}`,
                role: 'user',
                content,
            }
            const assistantId = `m${++counter.current}`
            const history = [...messages, userMsg]
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
            const wireMessages = history
                .filter(m => !m.error)
                .map(m => ({ role: m.role, content: m.content }))

            const controller = new AbortController()
            abortRef.current = controller

            const setAssistant = (patch: Partial<DocsChatMessage>) =>
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId ? { ...m, ...patch } : m,
                    ),
                )

            const finishError = () =>
                setAssistant({
                    content: 'Something went wrong answering that. Try again.',
                    error: true,
                    streaming: false,
                })

            // Non-streaming fallback: the original `/generate` round-trip.
            const runGenerate = async (): Promise<boolean> => {
                try {
                    const res = await fetch(
                        `${base}/api/agents/docs-agent/generate`,
                        {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ messages: wireMessages }),
                            signal: controller.signal,
                        },
                    )
                    if (!res.ok) return false
                    const data = await res.json()
                    const text = typeof data.text === 'string' ? data.text : ''
                    if (!text) return false
                    setAssistant({ content: text, streaming: false })
                    return true
                } catch {
                    return false
                }
            }

            try {
                let streamed = ''
                let opened = false
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
                            let sep: number
                            while ((sep = buffer.indexOf('\n\n')) !== -1) {
                                const evt = buffer.slice(0, sep)
                                buffer = buffer.slice(sep + 2)
                                const delta = extractTextDeltas(evt)
                                if (delta) {
                                    streamed += delta
                                    setAssistant({ content: streamed })
                                }
                            }
                        }
                        // Flush any trailing event without a closing blank line.
                        const tail = extractTextDeltas(buffer)
                        if (tail) {
                            streamed += tail
                            setAssistant({ content: streamed })
                        }
                    }
                } catch {
                    // Fall through to the fallback decision below.
                }

                if (streamed) {
                    // Got real tokens — finalize with what streamed, even if the
                    // stream later hiccuped; the answer is already useful.
                    setAssistant({ content: streamed, streaming: false })
                } else if (!opened) {
                    // Stream never opened (non-200 / network) — try /generate.
                    if (!(await runGenerate())) finishError()
                } else {
                    // Stream opened but produced no text — also fall back.
                    if (!(await runGenerate())) finishError()
                }
            } finally {
                setPending(false)
                abortRef.current = null
            }
        },
        [messages, pending],
    )

    const clear = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        setMessages([])
        setPending(false)
    }, [])

    return { messages, pending, send, clear }
}
