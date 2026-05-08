import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSSEProcessing } from '../src/hooks/useSSEProcessing'
import { FileSource, UploadStatus, type UploadFile } from '@upup/core'

// Minimal EventSource mock
type Handler = (event: MessageEvent) => void
class MockEventSource {
    static instances: MockEventSource[] = []
    url: string
    onmessage: Handler | null = null
    onerror: Handler | null = null
    closed = false

    constructor(url: string) {
        this.url = url
        MockEventSource.instances.push(this)
    }
    close() { this.closed = true }

    // Test helper: fire a message
    emit(data: string) {
        this.onmessage?.({ data } as MessageEvent)
    }
}

function makeFile(key = 'uploads/file.txt'): UploadFile {
    return {
        id: '1',
        name: 'file.txt',
        key,
        url: 'blob:x',
        source: FileSource.LOCAL,
        status: UploadStatus.READY,
        metadata: {},
    } as unknown as UploadFile
}

describe('useSSEProcessing', () => {
    beforeEach(() => {
        MockEventSource.instances = []
        vi.stubGlobal('EventSource', MockEventSource)
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('opens EventSource with correct URL when processingEndpoint is set', () => {
        const onFileProcessed = vi.fn()
        const { result } = renderHook(() =>
            useSSEProcessing({ processingEndpoint: '/api/processing', onFileProcessed }),
        )
        act(() => result.current.connectSSE(makeFile('test/key.txt')))

        expect(MockEventSource.instances).toHaveLength(1)
        expect(MockEventSource.instances[0].url).toBe('/api/processing?key=test%2Fkey.txt')
    })

    it('calls onFileProcessed with parsed JSON when message arrives', () => {
        const onFileProcessed = vi.fn()
        const file = makeFile('uploads/doc.pdf')
        const { result } = renderHook(() =>
            useSSEProcessing({ processingEndpoint: '/api/sse', onFileProcessed }),
        )
        act(() => result.current.connectSSE(file))
        act(() => MockEventSource.instances[0].emit('{"status":"done","url":"https://cdn.example.com/doc.pdf"}'))

        expect(onFileProcessed).toHaveBeenCalledWith(file, { status: 'done', url: 'https://cdn.example.com/doc.pdf' })
    })

    it('closes the EventSource after the message is received', () => {
        const { result } = renderHook(() =>
            useSSEProcessing({ processingEndpoint: '/api/sse', onFileProcessed: vi.fn() }),
        )
        act(() => result.current.connectSSE(makeFile()))
        const src = MockEventSource.instances[0]
        act(() => src.emit('{"ok":true}'))
        expect(src.closed).toBe(true)
    })

    it('does nothing when processingEndpoint is not set', () => {
        const { result } = renderHook(() => useSSEProcessing({}))
        act(() => result.current.connectSSE(makeFile()))
        expect(MockEventSource.instances).toHaveLength(0)
    })
})
