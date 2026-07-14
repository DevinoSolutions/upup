import { useCallback, useMemo, useRef, useState } from 'react'
import { MastraClient } from '@mastra/client-js'
import type { UpupConfig } from '../types'
import { getLocalAssistantPatch } from './localAssistant'

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
}

type UseMastraChatOptions = {
    baseUrl: string
    agentId: string
    /**
     * Called once per applyConfigPatch tool result. Returns the patch that
     * was applied so the consumer can merge it into ConfigContext.
     */
    onPatch: (event: AssistantPatchEvent) => void
}

const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Minimal chat hook talking directly to a Mastra agent's stream endpoint.
 *
 * Why not @ai-sdk/react useChat or CopilotKit? Mastra's client SDK already
 * understands the stream protocol our agent emits. Adding either of those
 * means another runtime in the middle. This hook is ~80 lines and does
 * exactly what the playground needs — text streaming + tool result hand-off.
 */
export function useMastraChat({ baseUrl, agentId, onPatch }: UseMastraChatOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const client = useMemo(() => new MastraClient({ baseUrl }), [baseUrl])

    const send = useCallback(
        async (input: string) => {
            const trimmed = input.trim()
            if (!trimmed || isStreaming) return

            setError(null)
            const userMsg: ChatMessage = { id: newId(), role: 'user', text: trimmed }

            const localPatch = getLocalAssistantPatch(trimmed)
            if (localPatch) {
                onPatch(localPatch)
                setMessages((prev) => [
                    ...prev,
                    userMsg,
                    {
                        id: newId(),
                        role: 'assistant',
                        text: localPatch.explanation,
                        patches: [localPatch],
                    },
                ])
                return
            }

            const asstId = newId()
            const asstMsg: ChatMessage = { id: asstId, role: 'assistant', text: '', pending: true }

            setMessages((prev) => [...prev, userMsg, asstMsg])
            setIsStreaming(true)

            const controller = new AbortController()
            abortRef.current = controller

            try {
                // .generate() returns the whole turn at once. We trade
                // token-streaming for fewer moving parts and a simpler
                // tool-result hand-off. The Mastra response shape we rely on
                // here was verified end-to-end during Phase 1 smoke tests.
                const agent = client.getAgent(agentId)
                const response: any = await agent.generate(trimmed)

                const text: string = response?.text ?? ''
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
                        const id: string | undefined = r?.toolCallId ?? r?.payload?.toolCallId
                        if (id && seen.has(id)) continue
                        const name = r?.toolName ?? r?.payload?.toolName
                        if (name !== 'apply-config-patch' && name !== 'applyConfigPatch') continue
                        const data = r?.result ?? r?.payload?.result
                        if (!data?.patch) continue
                        if (id) seen.add(id)
                        patches.push(data as AssistantPatchEvent)
                    }
                }
                collect(response?.toolResults)
                if (Array.isArray(response?.steps)) {
                    for (const step of response.steps) collect(step?.toolResults)
                }

                for (const p of patches) onPatch(p)

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === asstId ? { ...m, text, patches, pending: false } : m,
                    ),
                )
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Network error.'
                setError(msg)
                setMessages((prev) =>
                    prev.map((m) => (m.id === asstId ? { ...m, pending: false } : m)),
                )
            } finally {
                setIsStreaming(false)
                abortRef.current = null
            }
        },
        [agentId, client, isStreaming, onPatch],
    )

    const cancel = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setMessages([])
        setError(null)
        setIsStreaming(false)
    }, [])

    return { messages, isStreaming, error, send, cancel, reset }
}
