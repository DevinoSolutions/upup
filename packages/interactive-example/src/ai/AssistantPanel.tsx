import React, { useContext, useEffect, useRef, useState } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import { useMastraChat } from './useMastraChat'
import { PROMPT_SEEDS } from './promptSeeds'

type AssistantPanelProps = {
    /** Where the Mastra dev/prod server lives. Default: localhost dev. */
    mastraBaseUrl?: string
    /** Agent id registered in apps/playground-ai. */
    agentId?: string
}

const STORAGE_KEY = 'upup-ie:assistant-open'

/**
 * Right slide-over chat panel for the playground. Closed by default; opens
 * via the "Ask AI" trigger button. Talks straight to the Mastra agent and
 * applies returned config patches to ConfigContext.
 */
export function AssistantPanel({
    mastraBaseUrl = 'http://localhost:4111',
    agentId = 'playground-agent',
}: AssistantPanelProps) {
    const ctx = useContext(ConfigContext)
    const [open, setOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        return window.localStorage.getItem(STORAGE_KEY) === '1'
    })
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
        if (typeof window === 'undefined') return
        window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
    }, [open])

    useEffect(() => {
        // Cmd/Ctrl+K toggles the panel — industry-standard AI shortcut.
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setOpen((v) => !v)
            } else if (e.key === 'Escape' && open) {
                setOpen(false)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

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
        <>
            <button
                type="button"
                className="upup-ie-ai-trigger"
                aria-label="Open AI assistant"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                title="Ask AI (Cmd/Ctrl+K)"
            >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span>Ask AI</span>
            </button>

            {open && (
                <div
                    className="upup-ie-ai-backdrop"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`upup-ie-ai-panel ${open ? 'is-open' : ''}`}
                role="dialog"
                aria-label="AI assistant"
                aria-modal="false"
            >
                <header className="upup-ie-ai-header">
                    <span className="upup-ie-ai-title">Ask AI</span>
                    <div className="upup-ie-ai-header-actions">
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
                        <button
                            type="button"
                            className="upup-ie-ai-header-btn"
                            onClick={() => setOpen(false)}
                            aria-label="Close assistant"
                        >
                            ×
                        </button>
                    </div>
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
        </>
    )
}
