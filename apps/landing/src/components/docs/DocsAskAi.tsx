'use client'

import {
    Fragment,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import Link from 'next/link'
import {
    ArrowUp,
    Check,
    Copy,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    Trash2,
    X,
} from 'lucide-react'
import { clientEnv } from '@/lib/client/env'
import { captureClientEvent } from '@/lib/analytics/capture.client'
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard'
import {
    parseMarkdown,
    stableMarkdownPrefix,
    type Block,
    type Inline,
} from '@useupup/interactive-example/ai/markdownStream'
import type { useDocsChat, DocsChatMessage } from '@/lib/docs/use-docs-chat'
import { DocsAskAiStepTrail, stepSummary } from './DocsAskAiStepTrail'

const EXAMPLE_QUESTIONS = [
    'How do I enable resumable uploads?',
    "What's the difference between client and server mode?",
    'How do I theme the uploader?',
]

// Arrival of a NEW transcript item: opacity + 6px rise, once. Each message `li`
// is keyed by its stable id, so React mounts it exactly once and the CSS
// animation never replays on drawer reopen, navigation or streaming text growth
// (growth re-renders children of the same `li`; it is not re-mounted). Reduced
// motion: opacity only.
const ARRIVE =
    'motion-safe:animate-motion-enter motion-reduce:animate-motion-fade'

const LINK_CLASS =
    'text-blue-600 underline underline-offset-2 dark:text-blue-400'

// The user message immediately preceding an assistant message is its question —
// used for the feedback payload and error retry.
function questionForIndex(messages: DocsChatMessage[], index: number): string {
    for (let i = index - 1; i >= 0; i--) {
        if (messages[i].role === 'user') return messages[i].content
    }
    return ''
}

// Ease-in for streamed text. While a turn streams, only WHOLE units reach the
// DOM (stableMarkdownPrefix from the shared parser holds back a half-written
// link, URL, fence, table or list item), and every word / inline unit / list
// item / table row / code block is its own element keyed by its source offset.
// Each therefore mounts exactly once, already complete, and its CSS mount
// animation eases it in; units already on screen keep their element and never
// replay. Words and inline units fade (fast); block units fade and rise 6px
// (base). Both are `motion-safe:` only, so under prefers-reduced-motion the
// text simply appears.
const EASE = 'motion-safe:animate-motion-fade'
const EASE_BLOCK = 'motion-safe:animate-motion-enter'

// Keyboard users must be able to scroll an overflowing code block or table, so
// both scroll containers are focusable regions with a visible focus ring.
const SCROLL_FOCUS =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400'

// Assistant rendering: NO innerHTML anywhere — everything is React text nodes,
// same XSS posture as DocsSearch. Parsing is the playground's small markdown
// grammar (@useupup/interactive-example/ai/markdownStream): fenced code,
// tables, nested lists, headings and rules at block level; `code`, **bold**,
// [label](url) and bare URLs inline. `streaming` renders only the stable prefix
// of a still-growing answer; a finished answer renders in full.
export function MessageBody({
    content,
    streaming = false,
}: {
    content: string
    streaming?: boolean
}) {
    const shown = streaming ? stableMarkdownPrefix(content) : content
    const blocks = useMemo(() => parseMarkdown(shown), [shown])
    return (
        <>
            {blocks.map(block => (
                <BlockNode key={block.start} block={block} />
            ))}
        </>
    )
}

/** Plain text split into word pieces (word + trailing space), keyed by offset. */
function Words({ text, start }: { text: string; start: number }) {
    const pieces: ReactNode[] = []
    const re = /\S+\s*|\s+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
        pieces.push(
            <span key={start + m.index} className={EASE}>
                {m[0]}
            </span>,
        )
    }
    return <>{pieces}</>
}

function InlineNodes({
    tokens,
    ease = true,
}: {
    tokens: Inline[]
    ease?: boolean
}) {
    const cls = ease ? EASE : ''
    return (
        <>
            {tokens.map(tok => {
                switch (tok.type) {
                    case 'text':
                        return ease ? (
                            <Words
                                key={tok.start}
                                text={tok.text}
                                start={tok.start}
                            />
                        ) : (
                            <Fragment key={tok.start}>{tok.text}</Fragment>
                        )
                    case 'code':
                        return (
                            <code
                                key={tok.start}
                                className={`rounded bg-black/[0.06] px-1 py-0.5 text-xs dark:bg-white/10 ${cls}`}
                            >
                                {tok.text}
                            </code>
                        )
                    case 'bold':
                        return (
                            <strong
                                key={tok.start}
                                className={`font-semibold ${cls}`}
                            >
                                <InlineNodes
                                    tokens={tok.children}
                                    ease={false}
                                />
                            </strong>
                        )
                    case 'link':
                        return renderLink(
                            tok.href,
                            <InlineNodes tokens={tok.children} ease={false} />,
                            tok.start,
                            cls,
                        )
                }
            })}
        </>
    )
}

// A /docs/... path or a useupup.com docs URL routes through next/link (origin
// stripped so client navigation stays in-app); anything else opens externally.
function renderLink(url: string, label: ReactNode, key: number, ease: string) {
    let internalPath: string | null = null
    if (url === '/docs' || url.startsWith('/docs/')) internalPath = url
    else {
        try {
            const u = new URL(url)
            if (
                (u.hostname === 'useupup.com' ||
                    u.hostname.endsWith('.useupup.com')) &&
                (u.pathname === '/docs' || u.pathname.startsWith('/docs/'))
            )
                internalPath = `${u.pathname}${u.search}${u.hash}`
        } catch {
            // Not a parseable absolute URL — fall through to external anchor.
        }
    }
    if (internalPath) {
        return (
            <Link
                key={key}
                href={internalPath}
                className={`${LINK_CLASS} ${ease}`}
            >
                {label}
            </Link>
        )
    }
    // Model output is untrusted: a javascript:/data: URL in a markdown link
    // must never become a clickable anchor — render it as inert text instead.
    try {
        const protocol = new URL(url).protocol
        if (
            protocol !== 'http:' &&
            protocol !== 'https:' &&
            protocol !== 'mailto:'
        )
            return (
                <span key={key} className={ease}>
                    {label}
                </span>
            )
    } catch {
        return (
            <span key={key} className={ease}>
                {label}
            </span>
        )
    }
    return (
        <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`${LINK_CLASS} ${ease}`}
        >
            {label}
        </a>
    )
}

function BlockNode({ block }: { block: Block }) {
    switch (block.type) {
        case 'paragraph':
            return (
                <p className="my-2 first:mt-0 last:mb-0">
                    <InlineNodes tokens={block.inline} />
                </p>
            )
        case 'heading': {
            // Turn headings sit under the drawer's own heading levels.
            const Tag = `h${Math.min(block.level + 2, 6)}` as 'h3'
            return (
                <Tag
                    className={`my-2 text-sm font-semibold first:mt-0 last:mb-0 ${EASE_BLOCK}`}
                >
                    <InlineNodes tokens={block.inline} ease={false} />
                </Tag>
            )
        }
        case 'hr':
            return (
                <hr
                    className={`my-2 border-0 border-t border-black/10 dark:border-white/10 ${EASE_BLOCK}`}
                />
            )
        case 'code':
            return <CodeBlock code={block.code} lang={block.lang} />
        case 'list': {
            const items = block.items.map(item => (
                <li key={item.start} className={EASE_BLOCK}>
                    <InlineNodes tokens={item.inline} ease={false} />
                    {item.children.map(child => (
                        <BlockNode key={child.start} block={child} />
                    ))}
                </li>
            ))
            return block.ordered ? (
                <ol
                    start={block.firstNumber}
                    className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0"
                >
                    {items}
                </ol>
            ) : (
                <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">
                    {items}
                </ul>
            )
        }
        case 'table':
            return (
                <div
                    className={`my-2 max-w-full overflow-x-auto first:mt-0 last:mb-0 ${SCROLL_FOCUS} ${EASE_BLOCK}`}
                    tabIndex={0}
                    role="region"
                    aria-label="Table"
                >
                    <table className="border-collapse text-xs">
                        <thead>
                            <tr>
                                {block.header.map((cell, i) => (
                                    <th
                                        key={i}
                                        className="border border-black/10 px-2 py-1 text-left font-semibold dark:border-white/10"
                                    >
                                        <InlineNodes
                                            tokens={cell}
                                            ease={false}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map(row => (
                                <tr key={row.start} className={EASE_BLOCK}>
                                    {row.cells.map((cell, i) => (
                                        <td
                                            key={i}
                                            className="border border-black/10 px-2 py-1 text-left dark:border-white/10"
                                        >
                                            <InlineNodes
                                                tokens={cell}
                                                ease={false}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
    }
}

// A fenced code block: horizontal scroll is contained INSIDE the <pre> (the
// bubble/drawer itself never scrolls sideways) and a small copy control lifts
// the raw fence text — the exact string we already hold — onto the clipboard.
// Below lg the copy control is always visible and 44px (no hover on touch), so
// the pre gets a 48px floor (a one-line fence is ~42px) and 56px of right
// padding so the button fits inside the card and the end of a long line can be
// scrolled clear of it.
function CodeBlock({ code, lang }: { code: string; lang: string }) {
    return (
        <div
            className={`group relative my-2 first:mt-0 last:mb-0 ${EASE_BLOCK}`}
        >
            <pre
                tabIndex={0}
                role="region"
                aria-label={lang ? `${lang} code` : 'Code'}
                className={`max-w-full overflow-x-auto rounded-md border border-black/10 p-3 pr-9 text-xs max-lg:min-h-12 max-lg:pr-14 dark:border-white/10 ${SCROLL_FOCUS}`}
            >
                <code>{code}</code>
            </pre>
            <CopyButton text={code} />
        </div>
    )
}

function CopyButton({ text }: { text: string }) {
    const { copied, copy } = useCopyToClipboard(1500)
    return (
        <>
            <button
                type="button"
                aria-label={copied ? 'Copied' : 'Copy code'}
                onClick={() => copy(text)}
                className="absolute right-1.5 top-1.5 min-h-11 min-w-11 rounded-md border border-black/5 bg-[var(--bg-base)] p-1.5 text-gray-500 opacity-0 transition-opacity hover:text-gray-800 focus-visible:opacity-100 group-hover:opacity-100 max-lg:right-0.5 max-lg:top-0.5 max-lg:flex max-lg:items-center max-lg:justify-center lg:min-h-0 lg:min-w-0 dark:border-white/10 dark:text-gray-400 dark:hover:text-gray-100 [@media(hover:none)]:opacity-100"
            >
                {/* Both icons stay mounted in a fixed 14px box and cross-fade on
                    opacity alone — no scale or rotate. */}
                <span className="relative block h-3.5 w-3.5">
                    <Copy
                        className={`absolute inset-0 h-3.5 w-3.5 motion-safe:transition-opacity motion-safe:duration-fast ${
                            copied ? 'opacity-0' : 'opacity-100'
                        }`}
                    />
                    <Check
                        className={`absolute inset-0 h-3.5 w-3.5 text-green-600 motion-safe:transition-opacity motion-safe:duration-fast dark:text-green-400 ${
                            copied ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                </span>
            </button>
            {/* Persistent so the change is announced: a live region only speaks
                for text that changes inside an already-mounted container. */}
            <span role="status" className="sr-only">
                {copied ? 'Copied' : ''}
            </span>
        </>
    )
}

// A pulsing caret shown on the in-progress assistant bubble while tokens stream.
function StreamingCursor() {
    return (
        <span
            aria-hidden
            className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 rounded-sm bg-gray-500 align-baseline motion-safe:animate-pulse dark:bg-gray-400"
        />
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
    const returnFocusRef = useRef<HTMLElement | null>(null)
    const configured = !!clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL

    // Opening moves focus into the composer and remembers where it came from;
    // closing hands focus back to whatever opened the drawer (normally the
    // trigger button) so keyboard users don't land back at the top of the
    // document. Deliberately not a focus trap — the drawer is non-modal
    // (role="complementary"), so tabbing out of it is allowed.
    useEffect(() => {
        if (open) {
            returnFocusRef.current =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null
            textareaRef.current?.focus()
            return
        }
        const previous = returnFocusRef.current
        returnFocusRef.current = null
        previous?.focus()
    }, [open])

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

    // Announced politely, once per turn: empty while the answer is in flight
    // (so the region's text changes when it finishes), then a short sentence.
    const last = messages[messages.length - 1]
    const announcement =
        !pending && last && last.role === 'assistant' && !last.streaming
            ? last.error
                ? 'The answer failed.'
                : `Answer ready${
                      last.steps?.length
                          ? ` after ${stepSummary(last.steps)}`
                          : ''
                  }.`
            : ''

    function ask(question: string) {
        if (!question.trim() || pending) return
        captureClientEvent('docs_ai_question', { question })
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
        captureClientEvent('docs_ai_feedback', {
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
            inert={!open}
            onKeyDown={e => {
                if (e.key === 'Escape') {
                    e.stopPropagation()
                    onClose()
                }
            }}
            className={`fixed right-0 top-24 bottom-0 z-40 flex w-[380px] max-w-full flex-col border-l border-black/5 bg-[var(--bg-base)] dark:border-white/10 ${
                // Docked panel, so travel is a 16px nudge plus opacity, not the
                // full 380px. `visibility` is transitioned on the CLOSED state
                // only, so the close stays painted until it finishes (visible ->
                // hidden flips at the END of the duration). The open state
                // leaves it out: a transitioned hidden -> visible would hold
                // `hidden` for the first frame and the composer focus() in the
                // open effect would silently fail. `inert` pulls the closed
                // drawer out of focus and the a11y tree immediately. Reduced
                // motion: no transition at all.
                open
                    ? 'visible translate-x-0 opacity-100 motion-safe:transition-[transform,opacity] motion-safe:duration-base motion-safe:ease-motion-out'
                    : 'invisible translate-x-4 opacity-0 motion-safe:transition-[transform,opacity,visibility] motion-safe:duration-fast motion-safe:ease-motion-in'
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
                <div className="docs-scrollbar flex-1 overflow-y-auto px-4 py-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ask AI isn&apos;t configured in this environment.
                    </p>
                </div>
            ) : (
                <>
                    {/* Body */}
                    <div
                        ref={bodyRef}
                        className="docs-scrollbar flex-1 overflow-y-auto px-4 py-4"
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
                            // data-ph-mask: the transcript holds what the
                            // visitor typed (and answers that quote it), so
                            // session replays record it masked.
                            <ul className="space-y-4" data-ph-mask>
                                {messages.map((m, index) =>
                                    m.role === 'user' ? (
                                        <li
                                            key={m.id}
                                            className={`flex justify-end ${ARRIVE}`}
                                        >
                                            <div className="rounded-lg border border-black/5 px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:text-white">
                                                {m.content}
                                            </div>
                                        </li>
                                    ) : (
                                        // Resolved once per assistant message
                                        // instead of once per control that
                                        // needs it (retry + both thumbs).
                                        (question => (
                                            <li
                                                key={m.id}
                                                className={`space-y-1.5 ${ARRIVE}`}
                                            >
                                                {m.error ? (
                                                    <>
                                                        <DocsAskAiStepTrail
                                                            steps={
                                                                m.steps ?? []
                                                            }
                                                            pending={false}
                                                        />
                                                        <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                                                            {m.content}{' '}
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    ask(
                                                                        question,
                                                                    )
                                                                }
                                                                className="underline underline-offset-2"
                                                            >
                                                                Retry
                                                            </button>
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DocsAskAiStepTrail
                                                            steps={
                                                                m.steps ?? []
                                                            }
                                                            pending={
                                                                !!m.streaming
                                                            }
                                                        />
                                                        <div className="min-w-0 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                                                            <MessageBody
                                                                content={
                                                                    m.content
                                                                }
                                                                streaming={
                                                                    m.streaming
                                                                }
                                                            />
                                                            {m.streaming ? (
                                                                stableMarkdownPrefix(
                                                                    m.content,
                                                                ) ? (
                                                                    <StreamingCursor />
                                                                ) : (
                                                                    <TypingIndicator />
                                                                )
                                                            ) : null}
                                                        </div>
                                                        {m.streaming ? null : (
                                                            <div className="flex items-center gap-1">
                                                                <ThumbButton
                                                                    active={
                                                                        votes[
                                                                            m.id
                                                                        ] ===
                                                                        'up'
                                                                    }
                                                                    voted={
                                                                        !!votes[
                                                                            m.id
                                                                        ]
                                                                    }
                                                                    label="Good answer"
                                                                    onClick={() =>
                                                                        vote(
                                                                            m.id,
                                                                            'up',
                                                                            question,
                                                                            m.content,
                                                                        )
                                                                    }
                                                                >
                                                                    <ThumbsUp className="h-3.5 w-3.5" />
                                                                </ThumbButton>
                                                                <ThumbButton
                                                                    active={
                                                                        votes[
                                                                            m.id
                                                                        ] ===
                                                                        'down'
                                                                    }
                                                                    voted={
                                                                        !!votes[
                                                                            m.id
                                                                        ]
                                                                    }
                                                                    label="Bad answer"
                                                                    onClick={() =>
                                                                        vote(
                                                                            m.id,
                                                                            'down',
                                                                            question,
                                                                            m.content,
                                                                        )
                                                                    }
                                                                >
                                                                    <ThumbsDown className="h-3.5 w-3.5" />
                                                                </ThumbButton>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        ))(questionForIndex(messages, index))
                                    ),
                                )}
                                {pending && !messages.some(m => m.streaming) ? (
                                    <li
                                        aria-label="Assistant is typing"
                                        className={ARRIVE}
                                    >
                                        <TypingIndicator />
                                    </li>
                                ) : null}
                            </ul>
                        )}
                    </div>

                    <span
                        role="status"
                        aria-live="polite"
                        data-testid="docs-ask-ai-announcement"
                        className="sr-only"
                    >
                        {announcement}
                    </span>

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
