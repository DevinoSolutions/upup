import React, { useContext, useEffect, useRef, useState } from 'react'
import { ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { ConfigContext } from '../state/ConfigContext'
import { useMastraChat, type ChatMessage } from './useMastraChat'
import { PROMPT_SEEDS } from './promptSeeds'
import type { AiFeedbackEvent } from '../types'

type AssistantPanelProps = {
    /** Where the Mastra dev/prod server lives. Default: localhost dev. */
    mastraBaseUrl?: string | undefined
    /** Agent id registered in apps/mastra. */
    agentId?: string | undefined
    /** App identifier tagged onto AI traces + feedback events. */
    appId?: string | undefined
    /** Visitor's PostHog distinct id (host-supplied; package stays PostHog-free). */
    posthogDistinctId?: string | undefined
    /** Host sink for thumbs ratings / comments. Absent -> no thumbs rendered. */
    onAiFeedback?: ((event: AiFeedbackEvent) => void) | undefined
}

/** The model behind the agent, reported on feedback events for slicing. */
const FEEDBACK_MODEL = 'anthropic/claude-haiku-4.5'

const newFeedbackId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Thumbs up/down (plus an optional follow-up comment on thumbs-down) for one
 * completed assistant turn. Rating is captured immediately and exactly once;
 * after rating the buttons lock. Delivery is through `onAiFeedback` only — this
 * component never touches PostHog.
 */
function MessageFeedback({
    message,
    conversationId,
    appId,
    agentId,
    onAiFeedback,
}: {
    message: ChatMessage
    conversationId: string | null
    appId: string
    agentId: string
    onAiFeedback: (event: AiFeedbackEvent) => void
}) {
    const [rating, setRating] = useState<'up' | 'down' | null>(null)
    const [feedbackId, setFeedbackId] = useState<string | null>(null)
    const [commentOpen, setCommentOpen] = useState(false)
    const [commentSubmitted, setCommentSubmitted] = useState(false)
    const [comment, setComment] = useState('')

    /** Shared correlation set. Absent trace id is OMITTED, never faked. */
    function baseProps(fid: string): Record<string, string> {
        const props: Record<string, string> = {
            feedback_id: fid,
            feedback_source: 'ai_response',
            message_id: message.id,
            app_id: appId,
            agent_id: agentId,
            model: FEEDBACK_MODEL,
        }
        if (message.traceId) props.$ai_trace_id = message.traceId
        if (conversationId) props.$ai_session_id = conversationId
        return props
    }

    function rate(next: 'up' | 'down') {
        // Captured once per message — after rating, switching is not allowed.
        if (rating !== null) return
        const fid = newFeedbackId()
        setRating(next)
        setFeedbackId(fid)
        onAiFeedback({
            name: 'ai_response_rated',
            properties: { ...baseProps(fid), rating: next },
        })
        if (next === 'down') setCommentOpen(true)
    }

    function submitComment() {
        // Reuses the rating's feedback id; once-only.
        if (commentSubmitted || !feedbackId) return
        const text = comment.trim()
        if (!text) return
        onAiFeedback({
            name: 'ai_response_feedback_comment',
            properties: { ...baseProps(feedbackId), comment: text },
        })
        setCommentSubmitted(true)
        setCommentOpen(false)
    }

    return (
        <div className="upup-ie-ai-feedback" data-rated={rating ?? undefined}>
            <div className="upup-ie-ai-feedback-actions">
                <button
                    type="button"
                    className={`upup-ie-ai-feedback-btn${rating === 'up' ? ' is-selected' : ''}`}
                    onClick={() => rate('up')}
                    aria-label="Good response"
                    aria-pressed={rating === 'up'}
                    title="Good response"
                >
                    <ThumbsUp size={14} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={`upup-ie-ai-feedback-btn${rating === 'down' ? ' is-selected' : ''}`}
                    onClick={() => rate('down')}
                    aria-label="Bad response"
                    aria-pressed={rating === 'down'}
                    title="Bad response"
                >
                    <ThumbsDown size={14} aria-hidden="true" />
                </button>
                {(rating === 'up' || commentSubmitted) && (
                    <span className="upup-ie-ai-feedback-thanks">Thanks</span>
                )}
            </div>

            {commentOpen && (
                <div className="upup-ie-ai-comment">
                    <label
                        className="upup-ie-ai-comment-label"
                        htmlFor={`upup-ai-comment-${message.id}`}
                    >
                        What could have been better?
                    </label>
                    <div className="upup-ie-ai-comment-row">
                        <textarea
                            id={`upup-ai-comment-${message.id}`}
                            rows={2}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Optional — tell us what went wrong"
                            aria-label="What could have been better?"
                        />
                        <div className="upup-ie-ai-comment-buttons">
                            <button
                                type="button"
                                className="upup-ie-ai-comment-submit"
                                onClick={submitComment}
                                disabled={!comment.trim()}
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                className="upup-ie-ai-comment-dismiss"
                                onClick={() => setCommentOpen(false)}
                                aria-label="Dismiss"
                                title="Dismiss"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
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
    appId = 'upup',
    posthogDistinctId,
    onAiFeedback,
}: AssistantPanelProps) {
    const ctx = useContext(ConfigContext)
    const [input, setInput] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const { messages, isStreaming, error, conversationId, send, reset } =
        useMastraChat({
            baseUrl: mastraBaseUrl,
            agentId,
            appId,
            distinctId: posthogDistinctId,
            onPatch: event => {
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
                            Tell me how you want the uploader configured.
                            I&apos;ll update the sidebar and preview live — try
                            one of these:
                        </p>
                        <div className="upup-ie-ai-seeds">
                            {PROMPT_SEEDS.map(seed => (
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
                    messages.map(m => (
                        <div
                            key={m.id}
                            className={`upup-ie-ai-msg upup-ie-ai-msg-${m.role}`}
                        >
                            <div className="upup-ie-ai-msg-text">
                                {m.text}
                                {m.pending && (
                                    <span className="upup-ie-ai-cursor">▍</span>
                                )}
                            </div>
                            {m.patches?.map((p, i) => (
                                <div key={i} className="upup-ie-ai-patch">
                                    <strong>Applied:</strong> {p.explanation}
                                </div>
                            ))}
                            {onAiFeedback &&
                                m.role === 'assistant' &&
                                !m.pending &&
                                !m.error && (
                                    <MessageFeedback
                                        message={m}
                                        conversationId={conversationId}
                                        appId={appId}
                                        agentId={agentId}
                                        onAiFeedback={onAiFeedback}
                                    />
                                )}
                        </div>
                    ))
                )}
            </div>

            {error && <div className="upup-ie-ai-error">{error}</div>}

            <form className="upup-ie-ai-input" onSubmit={handleSubmit}>
                <textarea
                    id="upup-ai-message"
                    name="upup-ai-message"
                    ref={inputRef}
                    rows={2}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit(e)
                        }
                    }}
                    placeholder={
                        isStreaming ? 'Working…' : 'Describe your upload setup'
                    }
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
