'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
    ArrowUp,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    Trash2,
    X,
} from 'lucide-react'
import { clientEnv } from '@/lib/env'
import { clientDatasetCredentials } from '@/lib/analytics/dataset'
import type { useDocsChat, DocsChatMessage } from '@/lib/docs/use-docs-chat'

const EXAMPLE_QUESTIONS = [
    'How do I enable resumable uploads?',
    "What's the difference between client and server mode?",
    'How do I theme the uploader?',
]

const LINK_CLASS =
    'text-blue-600 underline underline-offset-2 dark:text-blue-400'

// Mirror of posthog-provider.tsx / InteractiveExampleClient's guard: delivery is
// dataset-gated (no-op on `disabled`) and posthog-js is imported lazily so it
// never rides a bundle that doesn't already pull it.
function captureDocsEvent(name: string, properties: Record<string, unknown>) {
    const { dataset } = clientDatasetCredentials()
    if (dataset === 'disabled') return
    void import('posthog-js')
        .then(({ default: posthog }) => {
            posthog.capture(name, properties)
        })
        .catch(() => {})
}

// The user message immediately preceding an assistant message is its question —
// used for the feedback payload and error retry.
function questionForIndex(messages: DocsChatMessage[], index: number): string {
    for (let i = index - 1; i >= 0; i--) {
        if (messages[i].role === 'user') return messages[i].content
    }
    return ''
}

// Assistant rendering: NO innerHTML anywhere — everything is React text nodes,
// same XSS posture as DocsSearch. Parse order is fenced code → links → inline
// code → plain text.
function MessageBody({ content }: { content: string }) {
    const segments = content.split(/(```[\s\S]*?```)/g)
    return (
        <>
            {segments.map((seg, i) => {
                const fence = /^```([\s\S]*?)```$/.exec(seg)
                if (fence) {
                    let code = fence[1]
                    const nl = code.indexOf('\n')
                    if (nl !== -1) {
                        const firstLine = code.slice(0, nl).trim()
                        // Drop a bare language tag (e.g. `ts`, `bash`) line.
                        if (/^[a-zA-Z0-9+#-]+$/.test(firstLine))
                            code = code.slice(nl + 1)
                    }
                    return (
                        <pre
                            key={i}
                            className="my-2 overflow-x-auto rounded-md border border-black/10 p-3 text-xs dark:border-white/10"
                        >
                            <code>{code.replace(/^\n+|\n+$/g, '')}</code>
                        </pre>
                    )
                }
                return <TextWithLinks key={i} text={seg} />
            })}
        </>
    )
}

function TextWithLinks({ text }: { text: string }) {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g)
    return (
        <>
            {parts.map((part, i) => {
                const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
                if (md) return renderLink(md[2], md[1], i)
                if (/^https?:\/\/\S+$/.test(part))
                    return renderLink(part, part, i)
                return <TextWithCode key={i} text={part} />
            })}
        </>
    )
}

// A /docs/... path or a useupup.com docs URL routes through next/link (origin
// stripped so client navigation stays in-app); anything else opens externally.
function renderLink(url: string, label: string, key: number) {
    let internalPath: string | null = null
    if (url === '/docs' || url.startsWith('/docs/')) internalPath = url
    else {
        try {
            const u = new URL(url)
            if (
                u.hostname.endsWith('useupup.com') &&
                (u.pathname === '/docs' || u.pathname.startsWith('/docs/'))
            )
                internalPath = `${u.pathname}${u.search}${u.hash}`
        } catch {
            // Not a parseable absolute URL — fall through to external anchor.
        }
    }
    if (internalPath) {
        return (
            <Link key={key} href={internalPath} className={LINK_CLASS}>
                {label}
            </Link>
        )
    }
    return (
        <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={LINK_CLASS}
        >
            {label}
        </a>
    )
}

function TextWithCode({ text }: { text: string }) {
    const parts = text.split(/(`[^`]+`)/g)
    return (
        <>
            {parts.map((part, i) => {
                const code = /^`([^`]+)`$/.exec(part)
                if (code)
                    return (
                        <code
                            key={i}
                            className="rounded bg-black/[0.06] px-1 py-0.5 text-xs dark:bg-white/10"
                        >
                            {code[1]}
                        </code>
                    )
                return <span key={i}>{part}</span>
            })}
        </>
    )
}

interface DocsAskAiProps {
    open: boolean
    onClose: () => void
    chat: ReturnType<typeof useDocsChat>
}

export function DocsAskAi({ open, onClose, chat }: DocsAskAiProps) {
    const { messages, pending, send, clear } = chat
    const [input, setInput] = useState('')
    const [votes, setVotes] = useState<Record<string, 'up' | 'down'>>({})
    const bodyRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const configured = !!clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL

    // Auto-scroll to the newest content whenever the transcript grows.
    useEffect(() => {
        const el = bodyRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages, pending])

    // Auto-grow the composer between 1 and 3 rows.
    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 96)}px`
    }, [input])

    function ask(question: string) {
        if (!question.trim() || pending) return
        captureDocsEvent('docs_ai_question', { question })
        void send(question)
    }

    function submit() {
        const trimmed = input.trim()
        if (!trimmed || pending) return
        ask(trimmed)
        setInput('')
    }

    function vote(
        messageId: string,
        choice: 'up' | 'down',
        question: string,
        answer: string,
    ) {
        if (votes[messageId]) return
        setVotes(prev => ({ ...prev, [messageId]: choice }))
        captureDocsEvent('docs_ai_feedback', {
            vote: choice,
            question,
            answer,
        })
    }

    return (
        <aside
            data-testid="docs-ask-ai-drawer"
            role="complementary"
            aria-label="Ask AI"
            aria-hidden={!open}
            className={`fixed right-0 top-24 bottom-0 z-40 flex w-[380px] max-w-full flex-col border-l border-black/5 bg-[var(--bg-base)] motion-safe:transition-transform motion-safe:duration-300 dark:border-white/10 ${
                open ? 'translate-x-0' : 'invisible translate-x-full'
            }`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Ask AI
                </span>
                <div className="ml-auto flex items-center gap-1">
                    {messages.length > 0 ? (
                        <button
                            type="button"
                            aria-label="Clear conversation"
                            onClick={() => {
                                clear()
                                setVotes({})
                            }}
                            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        aria-label="Close Ask AI"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {!configured ? (
                <div className="flex-1 overflow-y-auto px-4 py-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ask AI isn&apos;t configured in this environment.
                    </p>
                </div>
            ) : (
                <>
                    {/* Body */}
                    <div
                        ref={bodyRef}
                        className="flex-1 overflow-y-auto px-4 py-4"
                    >
                        {messages.length === 0 ? (
                            <div className="space-y-4">
                                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                    Ask a question about the upup docs and the
                                    assistant will answer with links to the
                                    relevant pages.
                                </p>
                                <div className="flex flex-col gap-2">
                                    {EXAMPLE_QUESTIONS.map(q => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => ask(q)}
                                            className="rounded-md border border-black/5 px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:border-black/10 hover:text-gray-900 dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {messages.map((m, index) =>
                                    m.role === 'user' ? (
                                        <li
                                            key={m.id}
                                            className="flex justify-end"
                                        >
                                            <div className="rounded-lg border border-black/5 px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:text-white">
                                                {m.content}
                                            </div>
                                        </li>
                                    ) : (
                                        <li key={m.id} className="space-y-1.5">
                                            {m.error ? (
                                                <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                                                    {m.content}{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            ask(
                                                                questionForIndex(
                                                                    messages,
                                                                    index,
                                                                ),
                                                            )
                                                        }
                                                        className="underline underline-offset-2"
                                                    >
                                                        Retry
                                                    </button>
                                                </p>
                                            ) : (
                                                <>
                                                    <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                                                        <MessageBody
                                                            content={m.content}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <ThumbButton
                                                            active={
                                                                votes[m.id] ===
                                                                'up'
                                                            }
                                                            voted={
                                                                !!votes[m.id]
                                                            }
                                                            label="Good answer"
                                                            onClick={() =>
                                                                vote(
                                                                    m.id,
                                                                    'up',
                                                                    questionForIndex(
                                                                        messages,
                                                                        index,
                                                                    ),
                                                                    m.content,
                                                                )
                                                            }
                                                        >
                                                            <ThumbsUp className="h-3.5 w-3.5" />
                                                        </ThumbButton>
                                                        <ThumbButton
                                                            active={
                                                                votes[m.id] ===
                                                                'down'
                                                            }
                                                            voted={
                                                                !!votes[m.id]
                                                            }
                                                            label="Bad answer"
                                                            onClick={() =>
                                                                vote(
                                                                    m.id,
                                                                    'down',
                                                                    questionForIndex(
                                                                        messages,
                                                                        index,
                                                                    ),
                                                                    m.content,
                                                                )
                                                            }
                                                        >
                                                            <ThumbsDown className="h-3.5 w-3.5" />
                                                        </ThumbButton>
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    ),
                                )}
                                {pending ? (
                                    <li aria-label="Assistant is typing">
                                        <TypingIndicator />
                                    </li>
                                ) : null}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-black/5 px-4 py-3 dark:border-white/10">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={textareaRef}
                                data-testid="docs-ask-ai-input"
                                rows={1}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        submit()
                                    }
                                }}
                                placeholder="Ask about the docs…"
                                aria-label="Ask about the docs"
                                className="max-h-24 min-h-[2.25rem] w-full resize-none rounded-md border border-black/5 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black/10 focus:outline-none dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white/20"
                            />
                            <button
                                type="button"
                                data-testid="docs-ask-ai-send"
                                aria-label="Send"
                                onClick={submit}
                                disabled={pending || input.trim().length === 0}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/5 text-gray-600 transition-colors hover:border-black/10 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </aside>
    )
}

function ThumbButton({
    active,
    voted,
    label,
    onClick,
    children,
}: {
    active: boolean
    voted: boolean
    label: string
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            disabled={voted}
            onClick={onClick}
            className={`rounded-md p-1.5 transition-colors disabled:cursor-default ${
                active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 disabled:hover:text-gray-400 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
        >
            {children}
        </button>
    )
}

function TypingIndicator() {
    return (
        <div
            className="flex items-center gap-1"
            role="status"
            aria-label="Loading"
        >
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-gray-400 motion-safe:animate-bounce dark:bg-gray-500"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    )
}
