// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/client/env', () => ({
    clientEnv: { NEXT_PUBLIC_MASTRA_BASE_URL: 'http://mastra.test' },
}))
const reportAiFailure = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/sentry', () => ({ reportAiFailure }))

import { useDocsChat } from '@/lib/docs/use-docs-chat'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

// Every docs Ask AI turn that ends in the visible error bubble reports exactly
// once; a stream failure that the /generate fallback rescues is reported once
// at stream-failed kind; a healthy or superseded turn reports nothing; the
// prompt is never part of any report.

const PROMPT = 'secret-prompt-text-7731'
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

type Route = () => Response | Promise<Response>

/** Route /stream and /generate separately. */
function stubFetch(route: { stream: Route; generate: Route }) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) =>
            url.endsWith('/stream') ? route.stream() : route.generate(),
        ),
    )
}

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

const errorChunk = (message: string) => ({
    type: 'error',
    payload: { error: { message } },
})

async function sendPrompt() {
    await act(async () => {
        await chat.send(PROMPT)
    })
}
const last = () => chat.messages[chat.messages.length - 1]!

describe('docs Ask AI failure reporting', () => {
    it('reports one empty-reply when the stream and /generate both yield no text', async () => {
        stubFetch({
            stream: () => sseResponse({ type: 'finish' }),
            generate: () => json({ text: '  ' }),
        })

        await sendPrompt()

        expect(last().error).toBe(true)
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        expect(reportAiFailure).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'docs-ask-ai',
                agentId: 'docs-agent',
                kind: 'empty-reply',
            }),
        )
    })

    it('reports one upstream-error when the stream and /generate both fail', async () => {
        stubFetch({
            stream: () => new Response('bad gateway', { status: 502 }),
            generate: () => new Response('bad gateway', { status: 502 }),
        })

        await sendPrompt()

        expect(last().error).toBe(true)
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        expect(reportAiFailure.mock.calls[0]![0]).toMatchObject({
            path: 'docs-ask-ai',
            agentId: 'docs-agent',
            kind: 'upstream-error',
        })
    })

    it('reports the swallowed stream failure once, at stream-failed kind, when /generate rescues it', async () => {
        stubFetch({
            stream: () => new Response('bad gateway', { status: 502 }),
            generate: () => json({ text: 'A real answer.' }),
        })

        await sendPrompt()

        expect(last().error).toBeUndefined()
        expect(last().content).toBe('A real answer.')
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        expect(reportAiFailure.mock.calls[0]![0]).toMatchObject({
            path: 'docs-ask-ai',
            agentId: 'docs-agent',
            kind: 'stream-failed',
        })
    })

    it('reports a stream that dies mid-answer, keeping the partial text', async () => {
        let sentFirst = false
        stubFetch({
            stream: () =>
                new Response(
                    new ReadableStream<Uint8Array>({
                        // Error on the second pull: erroring in start() would
                        // discard the chunk still queued.
                        pull(c) {
                            if (sentFirst)
                                c.error(new Error('connection reset'))
                            else c.enqueue(sse(delta('Half an ans')))
                            sentFirst = true
                        },
                    }),
                    { status: 200 },
                ),
            generate: () => new Response('unused', { status: 500 }),
        })

        await sendPrompt()

        expect(last().content).toBe('Half an ans')
        expect(last().error).toBeUndefined()
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        expect(reportAiFailure.mock.calls[0]![0]).toMatchObject({
            kind: 'stream-failed',
        })
    })

    it('does not report a healthy streamed turn', async () => {
        stubFetch({
            stream: () => sseResponse(delta('All good.')),
            generate: () => new Response('unused', { status: 500 }),
        })

        await sendPrompt()

        expect(last().content).toBe('All good.')
        expect(reportAiFailure).not.toHaveBeenCalled()
    })

    it('does not report a turn the visitor cleared mid-flight', async () => {
        let rejectStream!: (e: unknown) => void
        stubFetch({
            stream: () =>
                new Promise<Response>((_, reject) => {
                    rejectStream = reject
                }),
            generate: () => new Response('unused', { status: 500 }),
        })

        let sent!: Promise<void>
        await act(async () => {
            sent = chat.send(PROMPT)
            await new Promise(r => setTimeout(r, 0))
        })
        await act(async () => {
            chat.clear()
            rejectStream(new DOMException('aborted', 'AbortError'))
            await sent
        })

        expect(reportAiFailure).not.toHaveBeenCalled()
    })

    it('never puts the prompt in any report, even when the upstream error echoes it', async () => {
        // Only the paths that carry upstream text can echo the prompt: an error
        // chunk, a stream transport throw, and a /generate transport throw.
        // (HTTP bodies are never read, so a body echo cannot reach a report.)
        stubFetch({
            stream: () => sseResponse(errorChunk(`echo: ${PROMPT}`)),
            generate: () => {
                throw new Error(`generate broke on ${PROMPT}`)
            },
        })
        await sendPrompt()
        stubFetch({
            stream: () => {
                throw new Error(`stream broke on ${PROMPT}`)
            },
            generate: () => json({ text: '' }),
        })
        await sendPrompt()

        expect(reportAiFailure).toHaveBeenCalledTimes(2)
        expect(JSON.stringify(reportAiFailure.mock.calls)).not.toContain(PROMPT)
        // The reasons are still there, with the prompt replaced.
        const first = reportAiFailure.mock.calls[0]![0].message as string
        expect(first).toContain('echo: [redacted]')
        expect(first).toContain('generate broke on [redacted]')
        expect(reportAiFailure.mock.calls[1]![0].message).toContain(
            'stream broke on [redacted]',
        )
    })

    it('redacts a multi-line prompt echoed inside a JSON body', async () => {
        const multiLine = 'first line "quoted"\nsecond secret-9921'
        stubFetch({
            stream: () =>
                sseResponse(
                    errorChunk(`400 ${JSON.stringify({ input: multiLine })}`),
                ),
            generate: () => json({ text: '' }),
        })

        await act(async () => {
            await chat.send(multiLine)
        })

        expect(JSON.stringify(reportAiFailure.mock.calls)).not.toContain(
            'secret-9921',
        )
        expect(reportAiFailure.mock.calls[0]![0].message).toContain(
            '[redacted]',
        )
    })

    it('keeps the first, more specific reason when a transport throw follows an error chunk', async () => {
        let sent = false
        const body = new ReadableStream<Uint8Array>({
            pull(c) {
                if (!sent) {
                    sent = true
                    c.enqueue(sse(errorChunk('model overloaded')))
                    return
                }
                throw new Error('socket reset')
            },
        })
        stubFetch({
            stream: () => new Response(body, { status: 200 }),
            generate: () => new Response('down', { status: 503 }),
        })

        await sendPrompt()

        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        const message = reportAiFailure.mock.calls[0]![0].message as string
        expect(message).toContain('model overloaded')
        expect(message).not.toContain('socket reset')
    })

    it('reports exactly path, agentId, kind and message, nothing else', async () => {
        stubFetch({
            stream: () => new Response('bad gateway', { status: 502 }),
            generate: () => new Response('bad gateway', { status: 502 }),
        })

        await sendPrompt()

        expect(Object.keys(reportAiFailure.mock.calls[0]![0]).sort()).toEqual([
            'agentId',
            'kind',
            'message',
            'path',
        ])
    })

    it('treats an error chunk with no text as a failed stream and reports its real reason', async () => {
        stubFetch({
            stream: () => sseResponse(errorChunk('model overloaded')),
            generate: () => new Response('down', { status: 503 }),
        })

        await sendPrompt()

        expect(last().error).toBe(true)
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        const report = reportAiFailure.mock.calls[0]![0]
        expect(report.kind).toBe('upstream-error')
        expect(report.message).toContain('model overloaded')
        expect(report.message).not.toContain('empty stream')
    })

    it('warns with the real reason when /generate rescues a stream that ended on an error chunk with no text', async () => {
        stubFetch({
            stream: () => sseResponse(errorChunk('model overloaded')),
            generate: () => json({ text: 'Rescued answer.' }),
        })

        await sendPrompt()

        expect(last().content).toBe('Rescued answer.')
        expect(last().error).toBeUndefined()
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        expect(reportAiFailure.mock.calls[0]![0]).toMatchObject({
            kind: 'stream-failed',
            message: 'model overloaded',
        })
    })

    it('does not let partial text pass as the answer when the stream ends on an error chunk', async () => {
        stubFetch({
            stream: () =>
                sseResponse(
                    delta('Half an ans'),
                    errorChunk('model overloaded'),
                ),
            generate: () => new Response('down', { status: 503 }),
        })

        await sendPrompt()

        expect(last().error).toBe(true)
        expect(last().content).not.toContain('Half an ans')
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        const report = reportAiFailure.mock.calls[0]![0]
        expect(report.kind).toBe('upstream-error')
        expect(report.message).toContain('model overloaded')
    })

    it('replaces partial text with the /generate answer, and warns once, when it rescues an errored stream', async () => {
        stubFetch({
            stream: () =>
                sseResponse(
                    delta('Half an ans'),
                    errorChunk('model overloaded'),
                ),
            generate: () => json({ text: 'The full answer.' }),
        })

        await sendPrompt()

        expect(last().content).toBe('The full answer.')
        expect(last().error).toBeUndefined()
        expect(reportAiFailure).toHaveBeenCalledTimes(1)
        expect(reportAiFailure.mock.calls[0]![0]).toMatchObject({
            kind: 'stream-failed',
            message: 'model overloaded',
        })
    })

    it('scrubs key-like tokens out of the reason', async () => {
        const key = 'sk-or-v1-abcdef1234567890abcdef'
        stubFetch({
            stream: () => sseResponse(errorChunk(`401 bad key ${key}`)),
            generate: () => new Response('down', { status: 503 }),
        })

        await sendPrompt()

        const serialised = JSON.stringify(reportAiFailure.mock.calls)
        expect(serialised).not.toContain(key)
        expect(serialised).toContain('401 bad key')
    })

    it('does not report a fetch that rejects because the page is unloading', async () => {
        let rejectStream!: (e: unknown) => void
        stubFetch({
            stream: () =>
                new Promise<Response>((_, reject) => {
                    rejectStream = reject
                }),
            generate: () =>
                Promise.reject(new TypeError('Failed to fetch')) as never,
        })

        let sent!: Promise<void>
        await act(async () => {
            sent = chat.send(PROMPT)
            await new Promise(r => setTimeout(r, 0))
        })
        await act(async () => {
            window.dispatchEvent(new Event('pagehide'))
            rejectStream(new TypeError('Failed to fetch'))
            await sent
        })

        expect(reportAiFailure).not.toHaveBeenCalled()
    })
})
