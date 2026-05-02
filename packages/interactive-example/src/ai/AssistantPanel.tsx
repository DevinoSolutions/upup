import React, { useContext, useEffect, useRef, useState } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import { useMastraChat } from './useMastraChat'
import { PROMPT_SEEDS } from './promptSeeds'

type AssistantPanelProps = {
    /** Where the Mastra dev/prod server lives. Default: localhost dev. */
    mastraBaseUrl?: string
    /** Agent id registered in apps/mastra. */
    agentId?: string
}

/**
 * Inline AI chat column for the playground. Always visible; lives in the
 * Shell grid as a third column to the right of the preview. No slide-over,
 * no trigger button — the panel is part of the layout.
 *
 * Talks straight to the Mastra agent and applies returned config patches
 * to ConfigContext.
 */
export function AssistantPanel({
    mastraBaseUrl = 'http://localhost:4111',
    agentId = 'playground-agent',
}: AssistantPanelProps) {
    const ctx = useContext(ConfigContext)
    const [input, setInput] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const { messages, isStreaming, error, send, reset } = useMastraChat({
        baseUrl: mastraBaseUrl,
        agentId,
        onPatch: (event) => {
            ctx?.setConfigPatch(event.patch)
        },
    })

    useEffect(() => {
        // Autoscroll to the latest message as it streams.
        const el = listRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const value = input.trim()
        if (!value) return
        setInput('')
        void send(value)
    }

    function handleSeed(seed: string) {
        setInput('')
        void send(seed)
    }

    if (!ctx) return null

    return (
        <aside
            className="upup-ie-ai-panel"
            role="region"
            aria-label="AI assistant"
        >
            <header className="upup-ie-ai-header">
                <span className="upup-ie-ai-title">Ask AI</span>
                {messages.length > 0 && (
                    <button
                        type="button"
                        className="upup-ie-ai-header-btn"
                        onClick={reset}
                        title="Clear conversation"
                    >
                        Clear
                    </button>
                )}
            </header>

            <div ref={listRef} className="upup-ie-ai-messages">
                {messages.length === 0 ? (
                    <div className="upup-ie-ai-empty">
                        <p>
                            Tell me how you want the uploader configured. I&apos;ll update
                            the sidebar and preview live — try one of these:
                        </p>
                        <div className="upup-ie-ai-seeds">
                            {PROMPT_SEEDS.map((seed) => (
                                <button
                                    key={seed}
                                    type="button"
                                    className="upup-ie-ai-seed"
                                    onClick={() => handleSeed(seed)}
                                >
                                    {seed}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={`upup-ie-ai-msg upup-ie-ai-msg-${m.role}`}>
                            <div className="upup-ie-ai-msg-text">
                                {m.text}
                                {m.pending && <span className="upup-ie-ai-cursor">▍</span>}
                            </div>
                            {m.patches?.map((p, i) => (
                                <div key={i} className="upup-ie-ai-patch">
                                    <strong>Applied:</strong> {p.explanation}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {error && <div className="upup-ie-ai-error">{error}</div>}

            <form className="upup-ie-ai-input" onSubmit={handleSubmit}>
                <textarea
                    ref={inputRef}
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit(e)
                        }
                    }}
                    placeholder={isStreaming ? 'Working…' : 'Describe your upload setup'}
                    disabled={isStreaming}
                    aria-label="Message"
                />
                <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    aria-label="Send"
                >
                    ▶
                </button>
            </form>
        </aside>
    )
}
