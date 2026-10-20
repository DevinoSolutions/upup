import React, { useMemo } from 'react'
import {
    parseMarkdown,
    stableMarkdownPrefix,
    type Block,
    type Inline,
} from './markdownStream'

/*
 * Assistant-turn renderer. No innerHTML: model output is untrusted, so every
 * node is a React element or text node.
 *
 * Ease-in without timers: the DOM is a pure function of the text, and every
 * word / inline unit / list item / table row / code block is its own element
 * keyed by its source offset. While streaming only whole units are rendered
 * (stableMarkdownPrefix), so each one mounts exactly once, already complete,
 * and its CSS mount animation (.upup-ie-ai-ease*) fades it in. Units already
 * on screen keep their element and never replay. The finished render is the
 * same markup an unchunked render produces. Reduced motion is handled in CSS.
 */

const EASE = 'upup-ie-ai-ease'
const EASE_BLOCK = 'upup-ie-ai-ease-block'

function safeHref(href: string): string | null {
    try {
        const { protocol } = new URL(href)
        return protocol === 'https:' ||
            protocol === 'http:' ||
            protocol === 'mailto:'
            ? href
            : null
    } catch {
        return null
    }
}

/** Plain text split into word pieces (word + trailing space), keyed by offset. */
function Words({ text, start }: { text: string; start: number }) {
    const pieces: React.ReactNode[] = []
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
    return (
        <>
            {tokens.map(tok => {
                const cls = ease ? EASE : undefined
                switch (tok.type) {
                    case 'text':
                        return ease ? (
                            <Words
                                key={tok.start}
                                text={tok.text}
                                start={tok.start}
                            />
                        ) : (
                            <React.Fragment key={tok.start}>
                                {tok.text}
                            </React.Fragment>
                        )
                    case 'code':
                        return (
                            <code key={tok.start} className={cls}>
                                {tok.text}
                            </code>
                        )
                    case 'bold':
                        return (
                            <strong key={tok.start} className={cls}>
                                <InlineNodes
                                    tokens={tok.children}
                                    ease={false}
                                />
                            </strong>
                        )
                    case 'link': {
                        const href = safeHref(tok.href)
                        if (!href)
                            return (
                                <span key={tok.start} className={cls}>
                                    {tok.label}
                                </span>
                            )
                        return (
                            <a
                                key={tok.start}
                                className={cls}
                                href={href}
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                {tok.label}
                            </a>
                        )
                    }
                }
            })}
        </>
    )
}

function BlockNode({ block }: { block: Block }) {
    switch (block.type) {
        case 'paragraph':
            return (
                <p>
                    <InlineNodes tokens={block.inline} />
                </p>
            )
        case 'heading': {
            // Turn headings sit under the panel's own heading levels.
            const Tag = `h${Math.min(block.level + 2, 6)}` as 'h3'
            return (
                <Tag className={EASE_BLOCK}>
                    <InlineNodes tokens={block.inline} ease={false} />
                </Tag>
            )
        }
        case 'hr':
            return <hr className={EASE_BLOCK} />
        case 'code':
            return (
                <pre
                    className={`upup-ie-ai-md-scroll ${EASE_BLOCK}`}
                    tabIndex={0}
                    role="region"
                    aria-label={block.lang ? `${block.lang} code` : 'Code'}
                    data-lang={block.lang || undefined}
                >
                    <code>{block.code}</code>
                </pre>
            )
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
                <ol start={block.firstNumber}>{items}</ol>
            ) : (
                <ul>{items}</ul>
            )
        }
        case 'table':
            return (
                <div
                    className={`upup-ie-ai-md-scroll ${EASE_BLOCK}`}
                    tabIndex={0}
                    role="region"
                    aria-label="Table"
                >
                    <table>
                        <thead>
                            <tr>
                                {block.header.map((cell, i) => (
                                    <th key={i}>
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
                                        <td key={i}>
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

export function MarkdownMessage({
    text,
    streaming,
}: {
    text: string
    /** While true, only whole markdown units are rendered. */
    streaming: boolean
}) {
    const shown = streaming ? stableMarkdownPrefix(text) : text
    const blocks = useMemo(() => parseMarkdown(shown), [shown])
    return (
        <div className="upup-ie-ai-md">
            {blocks.map(block => (
                <BlockNode key={block.start} block={block} />
            ))}
        </div>
    )
}
