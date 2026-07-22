'use client'

import { useCallback, useRef, useState } from 'react'
import { clientEnv } from '@/lib/env'

export interface DocsChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    error?: boolean
}

// Deliberate slim duplicate of the interactive-example transport: that hook
// (packages/interactive-example/src/ai/useMastraChat.ts) is coupled to config
// patching and the Mastra client SDK. The docs panel only needs plain
// question→answer over the same `/api/agents/<id>/generate` shape (request body
// `{ messages: [{ role, content }] }`, answer in `response.text`), so it talks
// to the endpoint with plain fetch and no extra dependency.
export function useDocsChat() {
    const [messages, setMessages] = useState<DocsChatMessage[]>([])
    const [pending, setPending] = useState(false)
    const counter = useRef(0)

    const send = useCallback(
        async (content: string) => {
            const base = clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL
            if (!base || pending) return
            const userMsg: DocsChatMessage = {
                id: `m${++counter.current}`,
                role: 'user',
                content,
            }
            const history = [...messages, userMsg]
            setMessages(history)
            setPending(true)
            try {
                const res = await fetch(
                    `${base}/api/agents/docs-agent/generate`,
                    {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            // Error bubbles are UI-only — replaying "Something
                            // went wrong" to the agent as a real assistant turn
                            // degrades every follow-up after a failure.
                            messages: history
                                .filter(m => !m.error)
                                .map(m => ({
                                    role: m.role,
                                    content: m.content,
                                })),
                        }),
                    },
                )
                if (!res.ok) throw new Error(`agent responded ${res.status}`)
                const data = await res.json()
                const text = typeof data.text === 'string' ? data.text : ''
                if (!text) throw new Error('empty answer')
                setMessages(prev => [
                    ...prev,
                    {
                        id: `m${++counter.current}`,
                        role: 'assistant',
                        content: text,
                    },
                ])
            } catch {
                setMessages(prev => [
                    ...prev,
                    {
                        id: `m${++counter.current}`,
                        role: 'assistant',
                        content:
                            'Something went wrong answering that. Try again.',
                        error: true,
                    },
                ])
            } finally {
                setPending(false)
            }
        },
        [messages, pending],
    )

    const clear = useCallback(() => setMessages([]), [])
    return { messages, pending, send, clear }
}
