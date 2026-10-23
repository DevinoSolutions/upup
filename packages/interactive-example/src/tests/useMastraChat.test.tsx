import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMastraChat } from '../ai/useMastraChat'

// The Mastra client is mocked at the SDK boundary: `agent.stream()` resolves
// to an object whose processDataStream replays scripted chunks (the shape
// @mastra/client-js hands its onChunk callback). `gate` lets a test pause the
// stream mid-turn and look at what the UI holds at that moment. The mock
// honours `abortSignal` like the real SDK: an abort while paused rejects with
// an AbortError, after first delivering `onAbort` chunks (ones already read
// off the wire when the abort lands).
type StreamOptions = {
    abortSignal?: AbortSignal
    tracingOptions?: { traceId?: string }
}

const sdk = vi.hoisted(() => ({
    chunks: [] as unknown[],
    onAbort: [] as unknown[],
    pauseAfter: -1,
    gate: null as Promise<void> | null,
    streamCalls: 0,
    generateCalls: 0,
    options: [] as StreamOptions[],
}))

const abortError = () => new DOMException('The user aborted.', 'AbortError')

vi.mock('@mastra/client-js', () => ({
    MastraClient: class {
        getAgent() {
            return {
                generate: async () => {
                    sdk.generateCalls++
                    return { text: '' }
                },
                stream: async (_message: string, options: StreamOptions) => {
                    sdk.streamCalls++
                    sdk.options.push(options)
                    const signal = options.abortSignal
                    const aborted = new Promise<never>((_, reject) =>
                        signal?.addEventListener('abort', () =>
                            reject(abortError()),
                        ),
                    )
                    // Only ever awaited inside the race below.
                    aborted.catch(() => {})
                    return {
                        processDataStream: async ({
                            onChunk,
                        }: {
                            onChunk: (c: unknown) => Promise<void> | void
                        }) => {
                            for (let i = 0; i < sdk.chunks.length; i++) {
                                if (signal?.aborted) throw abortError()
                                await onChunk(sdk.chunks[i])
                                if (i === sdk.pauseAfter && sdk.gate) {
                                    try {
                                        await Promise.race([sdk.gate, aborted])
                                    } catch (e) {
                                        for (const c of sdk.onAbort)
                                            await onChunk(c)
                                        throw e
                                    }
                                }
                            }
                        },
                    }
                },
            }
        }
    },
}))

const delta = (text: string, id = 't') => ({
    type: 'text-delta',
    payload: { id, text },
})
const PATCH = {
    patch: { allowedFileTypes: 'images' },
    explanation: 'Only images are accepted now.',
}
const toolResult = (
    toolCallId: string | undefined,
    extra: Record<string, unknown> = {},
) => ({
    type: 'tool-result',
    payload: {
        toolCallId,
        toolName: 'applyConfigPatch',
        result: PATCH,
        ...extra,
    },
})

function setup(baseUrl = 'http://mastra.test') {
    const onPatch = vi.fn()
    const onAssistantError = vi.fn()
    const view = renderHook(() =>
        useMastraChat({
            baseUrl,
            agentId: 'playground-agent',
            onPatch,
            onAssistantError,
        }),
    )
    return { ...view, onPatch, onAssistantError }
}

/** Pause the scripted stream after chunk `after`; returns the release fn. */
function pauseAfter(after: number): () => void {
    let release!: () => void
    sdk.gate = new Promise<void>(r => (release = r))
    sdk.pauseAfter = after
    return release
}

const lastSignal = () => sdk.options[sdk.options.length - 1]?.abortSignal

beforeEach(() => {
    sdk.chunks = []
    sdk.onAbort = []
    sdk.pauseAfter = -1
    sdk.gate = null
    sdk.streamCalls = 0
    sdk.generateCalls = 0
    sdk.options = []
})

describe('useMastraChat streaming', () => {
    it('grows the assistant turn as text-delta chunks arrive', async () => {
        let release!: () => void
        sdk.gate = new Promise<void>(r => (release = r))
        sdk.chunks = [delta('Images '), delta('only, '), delta('done.')]
        sdk.pauseAfter = 1
        const { result } = setup()

        act(() => void result.current.send('photos only'))

        await waitFor(() =>
            expect(result.current.messages[1]?.text).toBe('Images only, '),
        )
        expect(result.current.messages[1]?.pending).toBe(true)
        expect(sdk.streamCalls).toBe(1)
        expect(sdk.generateCalls).toBe(0)

        await act(async () => release())
        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(result.current.messages[1]?.text).toBe('Images only, done.')
        expect(result.current.isPending).toBe(false)
    })

    it('applies each patch once, as soon as its tool result streams in', async () => {
        let release!: () => void
        sdk.gate = new Promise<void>(r => (release = r))
        sdk.chunks = [
            toolResult('call-1'),
            toolResult('call-1'),
            delta('Done.'),
        ]
        sdk.pauseAfter = 1
        const { result, onPatch } = setup()

        act(() => void result.current.send('photos only'))

        // Live: the preview updates before the closing sentence arrives.
        await waitFor(() => expect(onPatch).toHaveBeenCalledTimes(1))
        expect(result.current.messages[1]?.pending).toBe(true)

        await act(async () => release())
        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(onPatch).toHaveBeenCalledTimes(1)
        expect(onPatch).toHaveBeenCalledWith(PATCH)
        expect(result.current.messages[1]?.patches).toEqual([PATCH])
    })

    it('turns a stream error chunk into the honest unavailable turn', async () => {
        sdk.chunks = [
            delta('Partial '),
            { type: 'error', payload: { error: { message: 'model down' } } },
        ]
        const { result } = setup()

        await act(async () => result.current.send('photos only'))

        const turn = result.current.messages[1]
        expect(turn?.error).toBe(true)
        expect(turn?.pending).toBe(false)
        expect(turn?.text).toContain('model down')
    })

    it('drops chunks from a turn superseded by reset()', async () => {
        let release!: () => void
        sdk.gate = new Promise<void>(r => (release = r))
        sdk.chunks = [delta('First '), toolResult('call-9'), delta('late')]
        sdk.pauseAfter = 0
        const { result, onPatch } = setup()

        act(() => void result.current.send('photos only'))
        await waitFor(() =>
            expect(result.current.messages[1]?.text).toBe('First '),
        )
        act(() => result.current.reset())
        await act(async () => {
            release()
            // Let the rest of the scripted stream drain.
            await new Promise(r => setTimeout(r, 0))
        })

        expect(result.current.messages).toEqual([])
        expect(onPatch).not.toHaveBeenCalled()
    })

    it('reset() aborts the in-flight request and drops its late chunks', async () => {
        pauseAfter(0)
        sdk.chunks = [delta('First '), delta('never')]
        sdk.onAbort = [toolResult('call-late'), delta('late')]
        const { result, onPatch } = setup()

        act(() => void result.current.send('photos only'))
        await waitFor(() =>
            expect(result.current.messages[1]?.text).toBe('First '),
        )
        const signal = lastSignal()
        expect(signal?.aborted).toBe(false)

        await act(async () => result.current.reset())

        expect(signal?.aborted).toBe(true)
        expect(result.current.messages).toEqual([])
        expect(result.current.isPending).toBe(false)
        expect(result.current.error).toBe(null)
        expect(onPatch).not.toHaveBeenCalled()
    })

    it('unmount aborts the request and applies nothing that arrives after', async () => {
        pauseAfter(0)
        sdk.chunks = [delta('First ')]
        sdk.onAbort = [toolResult('call-late')]
        const { result, unmount, onPatch } = setup()

        act(() => void result.current.send('photos only'))
        await waitFor(() =>
            expect(result.current.messages[1]?.text).toBe('First '),
        )
        const signal = lastSignal()

        unmount()
        // Let the abort rejection settle through the hook's catch path.
        await act(async () => new Promise(r => setTimeout(r, 0)))

        expect(signal?.aborted).toBe(true)
        expect(onPatch).not.toHaveBeenCalled()
    })

    it('does not apply a tool result flagged isError', async () => {
        sdk.chunks = [
            toolResult('call-1', { isError: true }),
            delta('That failed.'),
        ]
        const { result, onPatch } = setup()

        await act(async () => result.current.send('photos only'))

        expect(onPatch).not.toHaveBeenCalled()
        expect(result.current.messages[1]?.patches).toEqual([])
        expect(result.current.messages[1]?.text).toBe('That failed.')
    })

    it('applies an id-less tool result reported twice only once', async () => {
        sdk.chunks = [
            toolResult(undefined),
            toolResult(''),
            toolResult(undefined),
            delta('Done.'),
        ]
        const { result, onPatch } = setup()

        await act(async () => result.current.send('photos only'))

        expect(onPatch).toHaveBeenCalledTimes(1)
        expect(result.current.messages[1]?.patches).toEqual([PATCH])
    })

    it('keeps two distinct id-less patches', async () => {
        const other = { patch: { maxFiles: 3 }, explanation: 'Up to 3.' }
        sdk.chunks = [
            toolResult(undefined),
            toolResult(undefined, { result: other }),
            delta('Done.'),
        ]
        const { result, onPatch } = setup()

        await act(async () => result.current.send('photos only'))

        expect(onPatch).toHaveBeenCalledTimes(2)
        expect(result.current.messages[1]?.patches).toEqual([PATCH, other])
    })

    it("prefers the server's chunk traceId over the client-assigned one", async () => {
        sdk.chunks = [
            { ...delta('Hi.'), traceId: 'feedbeef00000000feedbeef00000000' },
        ]
        const { result } = setup()

        await act(async () => result.current.send('photos only'))

        const assigned = sdk.options[0]?.tracingOptions?.traceId
        expect(assigned).toMatch(/^[0-9a-f]{32}$/)
        expect(result.current.messages[1]?.traceId).toBe(
            'feedbeef00000000feedbeef00000000',
        )
    })

    it('falls back to the client-assigned traceId when chunks carry none', async () => {
        sdk.chunks = [delta('Hi.')]
        const { result } = setup()

        await act(async () => result.current.send('photos only'))

        const assigned = sdk.options[0]?.tracingOptions?.traceId
        expect(assigned).toMatch(/^[0-9a-f]{32}$/)
        expect(result.current.messages[1]?.traceId).toBe(assigned)
    })
})

const toolCall = (toolCallId: string, extra: Record<string, unknown> = {}) => ({
    type: 'tool-call',
    payload: {
        toolCallId,
        toolName: 'apply-config-patch',
        args: { patch: PATCH.patch, explanation: PATCH.explanation },
        ...extra,
    },
})

describe('useMastraChat text parts', () => {
    it('separates the text before and after a tool call into paragraphs', async () => {
        sdk.chunks = [
            delta('Let me check the options:', 't1'),
            toolCall('c1'),
            toolResult('c1'),
            delta('Perfect! ', 't2'),
            delta('Here is how.', 't2'),
        ]
        const { result } = setup()

        act(() => void result.current.send('photos only'))

        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(result.current.messages[1]?.text).toBe(
            'Let me check the options:\n\nPerfect! Here is how.',
        )
    })

    it('separates two parts by id alone, with no tool or end chunk between them', async () => {
        sdk.chunks = [delta('A.', 't1'), delta('B.', 't2')]
        const { result } = setup()

        act(() => void result.current.send('photos only'))

        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(result.current.messages[1]?.text).toBe('A.\n\nB.')
    })

    it('still separates text that resumes after a tool step under the same id', async () => {
        sdk.chunks = [
            delta('Before.', 't1'),
            toolCall('c1'),
            toolResult('c1'),
            delta('After.', 't1'),
        ]
        const { result } = setup()

        act(() => void result.current.send('photos only'))

        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(result.current.messages[1]?.text).toBe('Before.\n\nAfter.')
    })

    it('adds no break after a trailing newline or before the first part', async () => {
        sdk.chunks = [
            toolCall('c1'),
            delta('First part.\n', 't1'),
            toolCall('c2'),
            delta('Second part.', 't2'),
        ]
        const { result } = setup()

        act(() => void result.current.send('photos only'))

        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(result.current.messages[1]?.text).toBe(
            'First part.\nSecond part.',
        )
    })
})

describe('useMastraChat step trail', () => {
    it('shows the running step live, then settles it when the result lands', async () => {
        let release!: () => void
        sdk.gate = new Promise<void>(r => (release = r))
        sdk.chunks = [
            toolCall('call-1'),
            toolResult('call-1', { toolName: 'apply-config-patch' }),
            delta('Done.'),
        ]
        sdk.pauseAfter = 0
        const { result } = setup()

        act(() => void result.current.send('photos only'))

        await waitFor(() =>
            expect(result.current.messages[1]?.steps).toEqual([
                {
                    id: 'call-1',
                    tool: 'apply-config-patch',
                    status: 'running',
                    label: 'Updating the uploader config: allowedFileTypes',
                },
            ]),
        )
        expect(result.current.messages[1]?.pending).toBe(true)

        await act(async () => release())
        await waitFor(() =>
            expect(result.current.messages[1]?.pending).toBe(false),
        )
        expect(result.current.messages[1]?.steps).toEqual([
            {
                id: 'call-1',
                tool: 'apply-config-patch',
                status: 'done',
                label: 'Updated the uploader config',
            },
        ])
        // The trail does not replace the Applied chip's patch.
        expect(result.current.messages[1]?.patches).toEqual([PATCH])
    })

    it('keeps one step per toolCallId when chunks repeat', async () => {
        sdk.chunks = [
            toolCall('call-1'),
            toolCall('call-1'),
            toolResult('call-1', { toolName: 'apply-config-patch' }),
            toolResult('call-1', { toolName: 'apply-config-patch' }),
            toolCall('call-2'),
            toolResult('call-2', { toolName: 'apply-config-patch' }),
            delta('Done.'),
        ]
        const { result, onPatch } = setup()

        await act(async () => result.current.send('photos only'))

        const steps = result.current.messages[1]?.steps
        expect(steps?.map(s => [s.id, s.status])).toEqual([
            ['call-1', 'done'],
            ['call-2', 'done'],
        ])
        expect(onPatch).toHaveBeenCalledTimes(2)
    })

    it('records a tool-error as a failed step in plain words', async () => {
        sdk.chunks = [
            toolCall('call-1'),
            {
                type: 'tool-error',
                payload: {
                    toolCallId: 'call-1',
                    toolName: 'apply-config-patch',
                    error: new Error('maxFiles must be positive'),
                },
            },
            delta('That did not work.'),
        ]
        const { result, onPatch } = setup()

        await act(async () => result.current.send('photos only'))

        expect(result.current.messages[1]?.steps).toEqual([
            {
                id: 'call-1',
                tool: 'apply-config-patch',
                status: 'error',
                label: 'That change failed: maxFiles must be positive',
            },
        ])
        expect(onPatch).not.toHaveBeenCalled()
        expect(result.current.messages[1]?.error).toBeUndefined()
    })

    it('gives a turn with no tool calls no trail', async () => {
        sdk.chunks = [delta('Hello.')]
        const { result } = setup()

        await act(async () => result.current.send('hi'))

        expect(result.current.messages[1]?.steps).toBeUndefined()
    })

    it('settles a step left running when the stream errors', async () => {
        sdk.chunks = [
            toolCall('call-1'),
            { type: 'error', payload: { error: { message: 'model down' } } },
        ]
        const { result } = setup()

        await act(async () => result.current.send('photos only'))

        const turn = result.current.messages[1]
        expect(turn?.error).toBe(true)
        expect(turn?.steps?.[0]).toMatchObject({
            status: 'error',
            label: 'Stopped before it finished: Updating the uploader config: allowedFileTypes',
        })
    })

    it('drops tool chunks from a turn superseded by reset()', async () => {
        let release!: () => void
        sdk.gate = new Promise<void>(r => (release = r))
        sdk.chunks = [delta('First '), toolCall('call-9')]
        sdk.pauseAfter = 0
        const { result } = setup()

        act(() => void result.current.send('photos only'))
        await waitFor(() =>
            expect(result.current.messages[1]?.text).toBe('First '),
        )
        act(() => result.current.reset())
        await act(async () => {
            release()
            await new Promise(r => setTimeout(r, 0))
        })

        expect(result.current.messages).toEqual([])
    })
})

describe('useMastraChat failure visibility', () => {
    const PROMPT = 'secret-prompt-text-7731'

    it('turns a stream that ends with no text into the unavailable turn, not a blank reply', async () => {
        sdk.chunks = []
        const { result, onAssistantError } = setup()

        await act(async () => result.current.send(PROMPT))

        const turn = result.current.messages[1]
        expect(turn?.error).toBe(true)
        expect(turn?.pending).toBe(false)
        expect(turn?.text).toContain('AI assistant is unavailable')
        expect(result.current.error).toContain('AI assistant is unavailable')
        expect(onAssistantError).toHaveBeenCalledTimes(1)
        expect(onAssistantError).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'playground-chat',
                agentId: 'playground-agent',
                kind: 'empty-reply',
            }),
        )
    })

    it('treats a whitespace-only reply as empty', async () => {
        sdk.chunks = [delta('  '), delta('\n')]
        const { result, onAssistantError } = setup()

        await act(async () => result.current.send(PROMPT))

        expect(result.current.messages[1]?.error).toBe(true)
        expect(onAssistantError).toHaveBeenCalledTimes(1)
        expect(onAssistantError.mock.calls[0]?.[0]).toMatchObject({
            kind: 'empty-reply',
        })
    })

    it('keeps a patch-only turn as a real answer: the config change was applied', async () => {
        sdk.chunks = [toolResult('call-1')]
        const { result, onPatch, onAssistantError } = setup()

        await act(async () => result.current.send(PROMPT))

        expect(onPatch).toHaveBeenCalledTimes(1)
        expect(result.current.messages[1]?.error).toBeUndefined()
        expect(onAssistantError).not.toHaveBeenCalled()
    })

    it('reports an upstream error chunk once, with the path and agent id', async () => {
        sdk.chunks = [
            delta('Partial '),
            { type: 'error', payload: { error: { message: 'model down' } } },
        ]
        const { result, onAssistantError } = setup()

        await act(async () => result.current.send(PROMPT))

        expect(result.current.messages[1]?.error).toBe(true)
        expect(onAssistantError).toHaveBeenCalledTimes(1)
        expect(onAssistantError).toHaveBeenCalledWith({
            path: 'playground-chat',
            agentId: 'playground-agent',
            kind: 'upstream-error',
            message: 'model down',
        })
    })

    it('never puts the visitor prompt in the report, even when the upstream error echoes it', async () => {
        sdk.chunks = [
            {
                type: 'error',
                payload: {
                    error: { message: `400 bad request: ${PROMPT}` },
                },
            },
        ]
        const first = setup()
        await act(async () => first.result.current.send(PROMPT))
        sdk.chunks = []
        const second = setup()
        await act(async () => second.result.current.send(PROMPT))

        const payloads = [
            ...first.onAssistantError.mock.calls,
            ...second.onAssistantError.mock.calls,
        ]
        expect(payloads).toHaveLength(2)
        expect(JSON.stringify(payloads)).not.toContain(PROMPT)
        // The reason survives, minus the echoed prompt.
        expect(payloads[0]![0].message).toContain('400 bad request')
    })

    it('reports exactly path, agentId, kind and message, nothing else', async () => {
        sdk.chunks = [
            { type: 'error', payload: { error: { message: 'model down' } } },
        ]
        const upstream = setup()
        await act(async () => upstream.result.current.send(PROMPT))
        sdk.chunks = []
        const empty = setup()
        await act(async () => empty.result.current.send(PROMPT))

        expect(
            Object.keys(upstream.onAssistantError.mock.calls[0]![0]).sort(),
        ).toEqual(['agentId', 'kind', 'message', 'path'])
        expect(
            Object.keys(empty.onAssistantError.mock.calls[0]![0]).sort(),
        ).toEqual(['agentId', 'kind', 'path'])
    })

    it('scrubs key-like tokens out of the upstream reason, then caps it', async () => {
        const secrets = [
            'sk-or-v1-abcdef1234567890abcdef',
            'Bearer eyJhbGciOi.payload.sig',
            'a'.repeat(16) + 'b'.repeat(40),
        ]
        sdk.chunks = [
            {
                type: 'error',
                payload: {
                    error: {
                        message: `401 ${secrets.join(' | ')} ${'z '.repeat(400)}`,
                    },
                },
            },
        ]
        const { result, onAssistantError } = setup()

        await act(async () => result.current.send(PROMPT))

        const message = onAssistantError.mock.calls[0]![0].message as string
        for (const secret of secrets) expect(message).not.toContain(secret)
        expect(message).toContain('401')
        expect(message).toContain('[redacted]')
        expect(message.length).toBeLessThanOrEqual(200)
    })

    it('redacts a multi-line prompt that the upstream echoes inside a JSON body', async () => {
        const multiLine = 'line one "quoted"\nline two secret-7731'
        const echoed = JSON.stringify({ input: multiLine })
        sdk.chunks = [
            { type: 'error', payload: { error: { message: `400 ${echoed}` } } },
        ]
        const { result, onAssistantError } = setup()

        await act(async () => result.current.send(multiLine))

        const message = onAssistantError.mock.calls[0]![0].message as string
        expect(message).not.toContain('secret-7731')
        expect(message).toContain('[redacted]')
        expect(message).toContain('400')
    })

    it('shows visitors a plain unavailable line, not the developer hint', async () => {
        sdk.chunks = []
        const { result, onAssistantError } = setup('https://agents.useupup.com')

        await act(async () => result.current.send(PROMPT))

        const turn = result.current.messages[1]
        expect(turn?.error).toBe(true)
        expect(turn?.text).toContain('AI assistant is unavailable')
        expect(turn?.text).toContain('Please try again in a moment.')
        expect(turn?.text).not.toContain('pnpm')
        expect(turn?.text).not.toContain('OPENROUTER_API_KEY')
        expect(result.current.error).not.toContain('localhost:4111')
        expect(onAssistantError).toHaveBeenCalledTimes(1)
    })

    it.each(['http://localhost:4111', 'http://127.0.0.1:4111'])(
        'keeps the developer hint when the agent base URL is %s',
        async baseUrl => {
            sdk.chunks = []
            const { result } = setup(baseUrl)

            await act(async () => result.current.send(PROMPT))

            const turn = result.current.messages[1]
            expect(turn?.text).toContain('AI assistant is unavailable')
            expect(turn?.text).toContain('pnpm run dev')
            expect(turn?.text).toContain('OPENROUTER_API_KEY')
        },
    )

    it('keeps the developer hint under NODE_ENV=development, whatever the base URL', async () => {
        vi.stubEnv('NODE_ENV', 'development')
        try {
            sdk.chunks = []
            const { result } = setup('https://agents.useupup.com')

            await act(async () => result.current.send(PROMPT))

            expect(result.current.messages[1]?.text).toContain('pnpm run dev')
        } finally {
            vi.unstubAllEnvs()
        }
    })

    it('does not report a healthy turn', async () => {
        sdk.chunks = [delta('All good.')]
        const { result, onAssistantError } = setup()

        await act(async () => result.current.send(PROMPT))

        expect(result.current.messages[1]?.error).toBeUndefined()
        expect(onAssistantError).not.toHaveBeenCalled()
    })

    it('does not report a turn superseded by reset()', async () => {
        let release!: () => void
        sdk.gate = new Promise<void>(r => (release = r))
        sdk.chunks = [delta('First '), delta('late')]
        sdk.pauseAfter = 0
        const { result, onAssistantError } = setup()

        act(() => void result.current.send(PROMPT))
        await waitFor(() =>
            expect(result.current.messages[1]?.text).toBe('First '),
        )
        act(() => result.current.reset())
        await act(async () => {
            release()
            await new Promise(r => setTimeout(r, 0))
        })

        expect(onAssistantError).not.toHaveBeenCalled()
    })

    it('still shows the unavailable turn when the reporter itself throws', async () => {
        sdk.chunks = []
        const { result, onAssistantError } = setup()
        onAssistantError.mockImplementation(() => {
            throw new Error('reporter down')
        })

        await act(async () => result.current.send(PROMPT))

        expect(result.current.messages[1]?.error).toBe(true)
        expect(result.current.isPending).toBe(false)
    })
})
