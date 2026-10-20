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

const delta = (text: string) => ({
    type: 'text-delta',
    payload: { id: 't', text },
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

function setup() {
    const onPatch = vi.fn()
    const view = renderHook(() =>
        useMastraChat({
            baseUrl: 'http://mastra.test',
            agentId: 'playground-agent',
            onPatch,
        }),
    )
    return { ...view, onPatch }
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
