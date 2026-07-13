/**
 * createSSEProcessing unit tests — framework-free, no Angular DI.
 *
 * Strategy: provide a minimal EventSource fake on globalThis so SSEProcessor
 * (which calls `new EventSource(url)`) can be exercised in jsdom without a real server.
 * The fake exposes `onmessage`, `onerror`, `close()`, and captures the url it was opened with.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { UploadFile } from '@useupup/core'
import { createSSEProcessing } from './use-sse-processing'

// ── Minimal EventSource fake ──────────────────────────────────────────────────

type FakeESInstance = {
    url: string
    onmessage: ((event: { data: string }) => void) | null
    onerror: (() => void) | null
    close: ReturnType<typeof vi.fn>
}

let lastInstance: FakeESInstance | null = null

class FakeEventSource {
    url: string
    onmessage: ((event: { data: string }) => void) | null = null
    onerror: (() => void) | null = null
    close = vi.fn()

    constructor(url: string) {
        this.url = url
        lastInstance = this as unknown as FakeESInstance
    }
}

// Install / uninstall on globalThis so SSEProcessor picks it up.
beforeEach(() => {
    lastInstance = null
    ;(globalThis as unknown as Record<string, unknown>)['EventSource'] =
        FakeEventSource
})

afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>)['EventSource']
    vi.useRealTimers()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(key: string): UploadFile {
    return { key } as unknown as UploadFile
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createSSEProcessing', () => {
    it('connectSSE opens an EventSource at the right URL', () => {
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed: vi.fn(),
        })
        connectSSE(makeFile('abc123'))

        expect(lastInstance).not.toBeNull()
        expect(lastInstance!.url).toContain('https://api.example.com/process')
        expect(lastInstance!.url).toContain('key=abc123')
        destroy()
    })

    it('does nothing when processingEndpoint is absent', () => {
        const { connectSSE, destroy } = createSSEProcessing({
            onFileProcessed: vi.fn(),
        })
        connectSSE(makeFile('abc'))
        expect(lastInstance).toBeNull()
        destroy()
    })

    it('does nothing when onFileProcessed is absent', () => {
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
        })
        connectSSE(makeFile('abc'))
        expect(lastInstance).toBeNull()
        destroy()
    })

    it('does nothing when file.key is falsy', () => {
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed: vi.fn(),
        })
        connectSSE(makeFile(''))
        expect(lastInstance).toBeNull()
        destroy()
    })

    it('calls onFileProcessed with parsed JSON on message', () => {
        const onFileProcessed = vi.fn()
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed,
        })
        const file = makeFile('k1')
        connectSSE(file)

        expect(lastInstance).not.toBeNull()
        // Simulate SSE message
        lastInstance!.onmessage!({ data: '{"status":"done","fileId":"k1"}' })

        expect(onFileProcessed).toHaveBeenCalledOnce()
        expect(onFileProcessed).toHaveBeenCalledWith(file, {
            status: 'done',
            fileId: 'k1',
        })
        // EventSource should be closed after message
        expect(lastInstance!.close).toHaveBeenCalled()
        destroy()
    })

    it('calls onError and closes EventSource on stream error', () => {
        const onError = vi.fn()
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed: vi.fn(),
            onError,
        })
        connectSSE(makeFile('k2'))

        expect(lastInstance).not.toBeNull()
        lastInstance!.onerror!()

        expect(onError).toHaveBeenCalledOnce()
        expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
        expect(lastInstance!.close).toHaveBeenCalled()
        destroy()
    })

    it('destroy() closes all open EventSources', () => {
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed: vi.fn(),
        })
        connectSSE(makeFile('x1'))
        const es1 = lastInstance!

        // Note: SSEProcessor guards duplicate keys; use different keys
        connectSSE(makeFile('x2'))
        const es2 = lastInstance!

        destroy()
        expect(es1.close).toHaveBeenCalled()
        expect(es2.close).toHaveBeenCalled()
    })

    it('calls onError and closes on timeout', () => {
        vi.useFakeTimers()
        const onError = vi.fn()
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed: vi.fn(),
            onError,
            processingTimeout: 5_000,
        })
        connectSSE(makeFile('k3'))
        expect(lastInstance).not.toBeNull()

        vi.advanceTimersByTime(5_001)

        expect(onError).toHaveBeenCalledOnce()
        expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
        expect(lastInstance!.close).toHaveBeenCalled()
        destroy()
    })

    it('destroy() is idempotent — second call does not throw', () => {
        const { connectSSE, destroy } = createSSEProcessing({
            processingEndpoint: 'https://api.example.com/process',
            onFileProcessed: vi.fn(),
        })
        connectSSE(makeFile('y1'))
        expect(() => {
            destroy()
            destroy()
        }).not.toThrow()
    })
})
