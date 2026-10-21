// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/client/env', () => ({
    clientEnv: { NEXT_PUBLIC_MASTRA_BASE_URL: 'http://mastra.test' },
}))
vi.mock('@/lib/analytics/capture.client', () => ({
    captureClientEvent: vi.fn(),
}))

import { stableMarkdownPrefix } from '@useupup/interactive-example/ai/markdownStream'
import { DocsAskAi, MessageBody } from '@/components/docs/DocsAskAi'
import { useDocsChat } from '@/lib/docs/use-docs-chat'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

// A turn exercising every unit that must arrive whole: a bold span, a markdown
// link, a bare URL, inline code, ordered and unordered list items, a fence and
// a table. No quotes or ampersands, so the markup's text needs no unescaping.
const DOC = [
    'Use presigned URLs for **server mode**. See [the guide](/docs/server) and https://useupup.com/docs/core for more.',
    '',
    '1. Install `@useupup/server` first',
    '2. Mount the handler',
    '',
    '- alpha item',
    '- beta item',
    '',
    '```ts',
    'const handler = createUpupHandler()',
    '```',
    '',
    '| name | mode |',
    '| ---- | ---- |',
    '| core | client |',
    '| server | server |',
    '',
    'Done here.',
].join('\n')

const WHOLE_LINK_LABELS = new Set([
    'the guide',
    'https://useupup.com/docs/core',
])
const WHOLE_LINK_HREFS = new Set(['/docs/server', '/docs/core'])
const WHOLE_ITEMS = new Set([
    'Install @useupup/server first',
    'Mount the handler',
    'alpha item',
    'beta item',
])
const WHOLE_CELLS = new Set(['name', 'mode', 'core', 'client', 'server'])
const WHOLE_CODE = 'const handler = createUpupHandler()'

function renderStreaming(content: string): HTMLElement {
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
        createElement(MessageBody, { content, streaming: true }),
    )
    return host
}

describe('streamed answer is shown in whole units only', () => {
    // One prefix per character: every state a token boundary could produce.
    const prefixes = Array.from({ length: DOC.length + 1 }, (_, n) =>
        DOC.slice(0, n),
    )

    it('only ever releases a prefix of the answer, and never retracts it', () => {
        let previous = ''
        for (const prefix of prefixes) {
            const shown = stableMarkdownPrefix(prefix)
            expect(DOC.startsWith(shown)).toBe(true)
            expect(shown.startsWith(previous)).toBe(true)
            previous = shown
        }
        // Only the still-open last word is withheld; the finished render
        // (MessageBody without `streaming`) releases it when the stream ends.
        expect(previous).toBe(DOC.slice(0, DOC.length - 'here.'.length))
    })

    it('never renders a half-written link, URL, code span, fence, item or cell', () => {
        let previousText = ''
        for (const prefix of prefixes) {
            const host = renderStreaming(prefix)
            const text = host.textContent ?? ''

            // Visible text only grows: nothing shown is ever taken back.
            expect(text.startsWith(previousText)).toBe(true)
            previousText = text

            // No unfinished syntax leaks through as literal characters.
            for (const raw of ['](', '[', ']', '**', '`', '|', '---']) {
                expect(text, `"${raw}" in: ${prefix}`).not.toContain(raw)
            }

            for (const a of host.querySelectorAll('a')) {
                expect(WHOLE_LINK_LABELS.has(a.textContent ?? '')).toBe(true)
                expect(WHOLE_LINK_HREFS.has(a.getAttribute('href') ?? '')).toBe(
                    true,
                )
            }
            for (const li of host.querySelectorAll('li')) {
                expect(WHOLE_ITEMS.has(li.textContent ?? '')).toBe(true)
            }
            for (const code of host.querySelectorAll('pre code')) {
                expect(code.textContent).toBe(WHOLE_CODE)
            }
            for (const cell of host.querySelectorAll('th, td')) {
                expect(WHOLE_CELLS.has(cell.textContent ?? '')).toBe(true)
            }
            // A table appears with its header and a delimiter row, never alone.
            if (host.querySelector('table')) {
                expect(host.querySelectorAll('th')).toHaveLength(2)
            }
        }
    })

    it('does not show the open word of a growing paragraph', () => {
        const text = renderStreaming('Use presigned UR').textContent
        expect(text).toBe('Use presigned ')
    })

    it('renders a finished answer in full, including a trailing unclosed opener as literal text', () => {
        const host = document.createElement('div')
        host.innerHTML = renderToStaticMarkup(
            createElement(MessageBody, { content: 'Use [the guide' }),
        )
        expect(host.textContent).toBe('Use [the guide')
    })
})

describe('streamed text eases in only where motion is allowed', () => {
    it('puts every animation class behind motion-safe, so reduced motion is instant', () => {
        const host = renderStreaming(DOC)
        const tokens = new Set<string>()
        for (const el of host.querySelectorAll('[class]')) {
            for (const t of el.getAttribute('class')!.split(/\s+/))
                tokens.add(t)
        }
        const animated = [...tokens].filter(t => t.includes('animate-'))
        expect(animated.length).toBeGreaterThan(0)
        for (const t of animated) {
            expect(t.startsWith('motion-safe:'), t).toBe(true)
        }
    })
})

// ── step trail, end to end through the real hook and drawer ────────────────

const enc = new TextEncoder()
const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`)

let container: HTMLDivElement
let root: Root
let chat: ReturnType<typeof useDocsChat>

function Harness() {
    chat = useDocsChat()
    return createElement(DocsAskAi, { open: true, onClose: () => {}, chat })
}

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(createElement(Harness)))
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})

function stubStream() {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({
        start(c) {
            controller = c
        },
    })
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(body, { status: 200 })),
    )
    return {
        push: async (...events: unknown[]) => {
            await act(async () => {
                for (const e of events) controller.enqueue(sse(e))
                await new Promise(r => setTimeout(r, 0))
            })
        },
        close: async () => {
            await act(async () => {
                controller.close()
                await new Promise(r => setTimeout(r, 0))
            })
        },
    }
}

const TOOL_CALL = {
    type: 'tool-call',
    payload: {
        toolCallId: 'c1',
        toolName: 'searchDocs',
        args: { query: 'presign' },
    },
}
const TOOL_RESULT = {
    type: 'tool-result',
    payload: {
        toolCallId: 'c1',
        toolName: 'searchDocs',
        result: { hits: [{ url: '/docs/server', title: 'Server' }] },
    },
}
const delta = (text: string) => ({ type: 'text-delta', payload: { text } })

const drawerText = () =>
    container.querySelector('[data-testid="docs-ask-ai-drawer"]')!.textContent!
const trailButton = () =>
    container.querySelector<HTMLButtonElement>(
        '[data-testid="docs-ask-ai-steps"] button',
    )
const announcement = () =>
    container.querySelector('[data-testid="docs-ask-ai-announcement"]')!
        .textContent

describe('step trail', () => {
    it('shows progress in plain words, then a collapsed trail, with one polite announcement at the end', async () => {
        const stream = stubStream()
        await act(async () => {
            void chat.send('How do I presign?')
            await new Promise(r => setTimeout(r, 0))
        })

        await stream.push(TOOL_CALL)
        // Mid-turn: the latest running step is the collapsed label; the live
        // region stays silent until the turn ends.
        expect(trailButton()!.textContent).toBe(
            "Searching the docs for 'presign'…",
        )
        expect(announcement()).toBe('')

        await stream.push(TOOL_RESULT, delta('Use the presign route. '))
        await stream.close()

        expect(trailButton()!.textContent).toBe('Show steps (1)')
        expect(announcement()).toBe('Answer ready after 1 step.')

        // Collapsed: steps are in the DOM, hidden, and not announced piecemeal.
        const list = container.querySelector('ol[id]') as HTMLOListElement
        expect(list.hidden).toBe(true)
        expect(
            container.querySelector(
                '[data-testid="docs-ask-ai-steps"] [aria-live]',
            ),
        ).toBeNull()
    })

    it('never shows tool names, JSON or result values', async () => {
        const stream = stubStream()
        await act(async () => {
            void chat.send('How do I presign?')
            await new Promise(r => setTimeout(r, 0))
        })
        await stream.push(TOOL_CALL, TOOL_RESULT, delta('Answer. '))
        await stream.close()

        act(() => trailButton()!.click())
        const text = drawerText()
        expect(text).toContain("Searched the docs for 'presign'")
        for (const leak of [
            'searchDocs',
            'search-docs',
            'toolCallId',
            'toolName',
            '"query"',
            '{',
            'hits',
        ]) {
            expect(text, leak).not.toContain(leak)
        }
    })

    it('is a real button: aria-expanded/aria-controls wired, focus stays on toggle', async () => {
        const stream = stubStream()
        await act(async () => {
            void chat.send('q')
            await new Promise(r => setTimeout(r, 0))
        })
        await stream.push(TOOL_CALL, TOOL_RESULT, delta('Answer. '))
        await stream.close()

        const button = trailButton()!
        const list = container.querySelector('ol[id]') as HTMLOListElement
        // A native <button type="button"> gets Enter and Space activation from
        // the browser; no key handler is needed (or present) to emulate it.
        expect(button.tagName).toBe('BUTTON')
        expect(button.getAttribute('type')).toBe('button')
        expect(button.getAttribute('aria-expanded')).toBe('false')
        expect(button.getAttribute('aria-controls')).toBe(list.id)

        act(() => button.focus())
        act(() => button.click())
        expect(button.getAttribute('aria-expanded')).toBe('true')
        expect(button.textContent).toBe('Hide steps')
        expect(list.hidden).toBe(false)
        expect(document.activeElement).toBe(button)

        act(() => button.click())
        expect(button.getAttribute('aria-expanded')).toBe('false')
        expect(list.hidden).toBe(true)
        expect(document.activeElement).toBe(button)
    })

    it('settles a step the stream never finished instead of leaving it running', async () => {
        const stream = stubStream()
        await act(async () => {
            void chat.send('q')
            await new Promise(r => setTimeout(r, 0))
        })
        await stream.push(TOOL_CALL, delta('Partial answer. '))
        await stream.close()

        const step = chat.messages[chat.messages.length - 1]!.steps![0]!
        expect(step.status).toBe('error')
        expect(step.label).toContain('Stopped before it finished')
    })

    it('has no trail and no step count for a turn that used no tools', async () => {
        const stream = stubStream()
        await act(async () => {
            void chat.send('q')
            await new Promise(r => setTimeout(r, 0))
        })
        await stream.push(delta('Plain answer. '))
        await stream.close()

        expect(trailButton()).toBeNull()
        expect(announcement()).toBe('Answer ready.')
    })
})
