import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMastraChat } from '../ai/useMastraChat'

// The Mastra client is mocked at the SDK boundary: `agent.stream()` resolves
// to an object whose processDataStream replays scripted chunks (the shape
// @mastra/client-js hands its onChunk callback). `gate` lets a test pause the
// stream mid-turn and look at what the UI holds at that moment.
const sdk = vi.hoisted(() => ({
    chunks: [] as unknown[],
    pauseAfter: -1,
    gate: null as Promise<void> | null,
    streamCalls: 0,
    generateCalls: 0,
}))

vi.mock('@mastra/client-js', () => ({
    MastraClient: class {
        getAgent() {
            return {
                generate: async () => {
                    sdk.generateCalls++
                    return { text: '' }
                },
                stream: async () => {
                    sdk.streamCalls++
                    return {
                        processDataStream: async ({
                            onChunk,
                        }: {
                            onChunk: (c: unknown) => Promise<void> | void
                        }) => {
                            for (let i = 0; i < sdk.chunks.length; i++) {
                                await onChunk(sdk.chunks[i])
                                if (i === sdk.pauseAfter && sdk.gate)
                                    await sdk.gate
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
const toolResult = (toolCallId: string) => ({
    type: 'tool-result',
    payload: { toolCallId, toolName: 'applyConfigPatch', result: PATCH },
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

beforeEach(() => {
    sdk.chunks = []
    sdk.pauseAfter = -1
    sdk.gate = null
    sdk.streamCalls = 0
    sdk.generateCalls = 0
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
})
