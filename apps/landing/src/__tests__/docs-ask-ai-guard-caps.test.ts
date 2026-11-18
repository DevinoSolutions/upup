// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/client/env', () => ({
    clientEnv: { NEXT_PUBLIC_MASTRA_BASE_URL: 'http://mastra.test' },
}))
vi.mock('@/lib/analytics/capture.client', () => ({
    captureClientEvent: vi.fn(),
}))
const reportAiFailure = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/sentry', () => ({ reportAiFailure }))

import { DocsAskAi } from '@/components/docs/DocsAskAi'
import {
    DOCS_CHAT_MAX_MESSAGE_CHARS,
    DOCS_CHAT_MAX_MESSAGES,
    useDocsChat,
} from '@/lib/docs/use-docs-chat'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

// The Mastra server's client-input guard refuses a chat body with more than 50
// messages or any message over 16,000 characters (HTTP 400), and answers a
// rate-limited sender 429 and an exhausted daily budget 503. The docs client
// keeps every body inside the caps, does not retry a refusal on /generate, and
// tells the visitor what actually happened.

const enc = new TextEncoder()
const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`)

let container: HTMLDivElement
let root: Root
let chat: ReturnType<typeof useDocsChat>

function Harness() {
    chat = useDocsChat()
    return null
}

beforeEach(() => {
    reportAiFailure.mockClear()
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

const sseResponse = (...events: unknown[]) =>
    new Response(
        new ReadableStream<Uint8Array>({
            start(c) {
                for (const e of events) c.enqueue(sse(e))
                c.close()
            },
        }),
        { status: 200 },
    )
const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    })
const delta = (text: string) => ({
    type: 'text-delta',
    payload: { id: 't', text },
})

type Route = (url: string, body: unknown) => Response | Promise<Response>

/** Stub fetch; every request is recorded as `{ url, body }`. */
function stubFetch(route: Route) {
    const calls: { url: string; body: { messages: Message[] } }[] = []
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: { body: string }) => {
            const body = JSON.parse(init.body)
            calls.push({ url, body })
            return route(url, body)
        }),
    )
    return calls
}

type Message = { role: string; content: string }

async function sendText(text: string) {
    await act(async () => {
        await chat.send(text)
    })
}
const last = () => chat.messages[chat.messages.length - 1]!

describe('docs Ask AI request caps', () => {
    it('keeps the thread limit under the server caps', () => {
        expect(DOCS_CHAT_MAX_MESSAGES).toBe(20)
        expect(DOCS_CHAT_MAX_MESSAGE_CHARS).toBe(16_000)
    })

    it('sends only the last 20 messages of a 30-message thread, newest last, while the UI keeps the whole thread', async () => {
        const calls = stubFetch(url =>
            url.endsWith('/stream')
                ? sseResponse(delta('reply'))
                : json({ text: 'unused' }),
        )
        // 15 turns = 30 messages (user + assistant each).
        for (let n = 1; n <= 15; n++) await sendText(`q${n}`)
        expect(chat.messages).toHaveLength(30)

        await sendText('newest')

        const sent = calls[calls.length - 1]!.body.messages
        expect(sent).toHaveLength(DOCS_CHAT_MAX_MESSAGES)
        expect(sent[sent.length - 1]).toEqual({
            role: 'user',
            content: 'newest',
        })
        // The window is the tail of the thread, dropped from the front:
        // 31 messages in history, so the first 11 are left out and the
        // window opens on message 12 (the 6th turn's reply, "reply").
        expect(sent.slice(-3)).toEqual([
            { role: 'user', content: 'q15' },
            { role: 'assistant', content: 'reply' },
            { role: 'user', content: 'newest' },
        ])
        expect(sent.map(m => m.content)).not.toContain('q1')
        // Nothing was removed from what the visitor sees.
        expect(chat.messages).toHaveLength(32)
        expect(chat.messages[0]!.content).toBe('q1')
    })

    it('sends a short thread whole', async () => {
        const calls = stubFetch(() => sseResponse(delta('reply')))
        await sendText('first')
        await sendText('second')

        expect(calls[calls.length - 1]!.body.messages).toEqual([
            { role: 'user', content: 'first' },
            { role: 'assistant', content: 'reply' },
            { role: 'user', content: 'second' },
        ])
    })

    it('caps the composer textarea at the per-message limit', () => {
        const el = document.createElement('div')
        document.body.append(el)
        const r = createRoot(el)
        act(() =>
            r.render(
                createElement(DocsAskAi, {
                    open: true,
                    onClose: vi.fn(),
                    chat: {
                        messages: [],
                        pending: false,
                        send: vi.fn(),
                        clear: vi.fn(),
                    } as unknown as ReturnType<typeof useDocsChat>,
                }),
            ),
        )
        const textarea = el.querySelector<HTMLTextAreaElement>(
            '[data-testid="docs-ask-ai-input"]',
        )
        expect(textarea?.maxLength).toBe(DOCS_CHAT_MAX_MESSAGE_CHARS)
        act(() => r.unmount())
        el.remove()
    })
})

describe('docs Ask AI refusals fail fast', () => {
    it.each([
        [400, 'too long', 'new chat'],
        [413, 'too long', 'new chat'],
        [429, 'Too many messages', 'Wait a moment'],
        [503, 'daily limit', 'tomorrow'],
    ])(
        'HTTP %i on the stream makes exactly one request and shows the specific message',
        async (status, ...needles) => {
            const calls = stubFetch(url =>
                url.endsWith('/stream')
                    ? json(
                          { error: 'invalid_request', message: 'server text' },
                          status,
                      )
                    : json({ text: 'must never be requested' }),
            )

            await sendText('a question')

            expect(calls).toHaveLength(1)
            expect(calls[0]!.url).toMatch(/\/stream$/)
            expect(last().error).toBe(true)
            expect(last().streaming).toBe(false)
            for (const n of needles) expect(last().content).toContain(n)
            expect(last().content).not.toContain('Something went wrong')
            // Never echo the server's text into the bubble.
            expect(last().content).not.toContain('server text')
            expect(reportAiFailure).toHaveBeenCalledTimes(1)
            expect(reportAiFailure.mock.calls[0]![0]).toMatchObject({
                path: 'docs-ask-ai',
                kind: 'upstream-error',
            })
        },
    )

    it('does not fall back on another 4xx, and shows the generic bubble', async () => {
        const calls = stubFetch(() => json({ error: 'not_found' }, 404))

        await sendText('a question')

        expect(calls).toHaveLength(1)
        expect(last().error).toBe(true)
        expect(last().content).toBe(
            'Something went wrong answering that. Try again.',
        )
    })
})

describe('docs Ask AI still falls back when the failure may be transient', () => {
    it('falls back to /generate on a 500 from the stream', async () => {
        const calls = stubFetch(url =>
            url.endsWith('/stream')
                ? new Response('boom', { status: 500 })
                : json({ text: 'Rescued answer.' }),
        )

        await sendText('a question')

        expect(calls.map(c => c.url.split('/').pop())).toEqual([
            'stream',
            'generate',
        ])
        expect(last().content).toBe('Rescued answer.')
        expect(last().error).toBeUndefined()
    })

    it('falls back to /generate when the stream request cannot connect', async () => {
        const calls: string[] = []
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                calls.push(url)
                if (url.endsWith('/stream'))
                    throw new TypeError('Failed to fetch')
                return json({ text: 'Rescued answer.' })
            }),
        )

        await sendText('a question')

        expect(calls.map(u => u.split('/').pop())).toEqual([
            'stream',
            'generate',
        ])
        expect(last().content).toBe('Rescued answer.')
    })

    it('falls back to /generate when the stream finishes with no text', async () => {
        const calls = stubFetch(url =>
            url.endsWith('/stream')
                ? sseResponse({ type: 'finish' })
                : json({ text: 'Rescued answer.' }),
        )

        await sendText('a question')

        expect(calls.map(c => c.url.split('/').pop())).toEqual([
            'stream',
            'generate',
        ])
        expect(last().content).toBe('Rescued answer.')
    })

    it('falls back to /generate when the stream ends on an error chunk', async () => {
        const calls = stubFetch(url =>
            url.endsWith('/stream')
                ? sseResponse({
                      type: 'error',
                      payload: { error: { message: 'model down' } },
                  })
                : json({ text: 'Rescued answer.' }),
        )

        await sendText('a question')

        expect(calls.map(c => c.url.split('/').pop())).toEqual([
            'stream',
            'generate',
        ])
        expect(last().content).toBe('Rescued answer.')
    })
})
