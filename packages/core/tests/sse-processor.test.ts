import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SSEProcessor } from '../src/sse-processor'

// The real EventSource#onmessage receives a MessageEvent; the processor only
// ever reads `.data` off it, so the fixture only needs to fake that much.
type FakeMessageEvent = { data: string }

interface FakeEventSourceInstance {
    onmessage: ((event: FakeMessageEvent) => void) | null
    onerror: (() => void) | null
    close: ReturnType<typeof vi.fn>
}

describe('SSEProcessor', () => {
    let mockClose: ReturnType<typeof vi.fn>
    let mockSource: FakeEventSourceInstance

    beforeEach(() => {
        mockClose = vi.fn()
        mockSource = { onmessage: null, onerror: null, close: mockClose }
        // Must be a real constructor function for `new EventSource(url)` to work
        const FakeEventSource = vi.fn(function (this: FakeEventSourceInstance) {
            Object.assign(this, mockSource)
            // Keep reference so handlers set on `this` are visible via mockSource
            mockSource.close = mockClose
            mockSource.onmessage = null
            mockSource.onerror = null
            // Proxy handler assignments back to mockSource
            Object.defineProperty(this, 'onmessage', {
                set(fn) {
                    mockSource.onmessage = fn
                },
                get() {
                    return mockSource.onmessage
                },
            })
            Object.defineProperty(this, 'onerror', {
                set(fn) {
                    mockSource.onerror = fn
                },
                get() {
                    return mockSource.onerror
                },
            })
            this.close = mockClose
        })
        vi.stubGlobal('EventSource', FakeEventSource)
    })

    it('opens an EventSource with the correct URL', () => {
        const processor = new SSEProcessor()
        processor.subscribe(
            'abc',
            'https://api.example.com/process',
            vi.fn(),
            vi.fn(),
        )
        expect(EventSource).toHaveBeenCalledWith(
            'https://api.example.com/process?key=abc',
        )
    })

    it('calls onMessage when data arrives', () => {
        const processor = new SSEProcessor()
        const onMessage = vi.fn()
        processor.subscribe(
            'abc',
            'https://api.example.com/process',
            onMessage,
            vi.fn(),
        )
        mockSource.onmessage!({ data: '{"status":"done"}' })
        expect(onMessage).toHaveBeenCalledWith({ status: 'done' })
    })

    it('closes the source after message', () => {
        const processor = new SSEProcessor()
        processor.subscribe(
            'abc',
            'https://api.example.com/process',
            vi.fn(),
            vi.fn(),
        )
        mockSource.onmessage!({ data: '{}' })
        expect(mockClose).toHaveBeenCalled()
    })

    it('calls onError on stream failure', () => {
        const processor = new SSEProcessor()
        const onError = vi.fn()
        processor.subscribe(
            'abc',
            'https://api.example.com/process',
            vi.fn(),
            onError,
        )
        mockSource.onerror!()
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('destroy closes all connections', () => {
        const processor = new SSEProcessor()
        processor.subscribe(
            'a',
            'https://api.example.com/process',
            vi.fn(),
            vi.fn(),
        )
        processor.destroy()
        expect(mockClose).toHaveBeenCalled()
    })
})
