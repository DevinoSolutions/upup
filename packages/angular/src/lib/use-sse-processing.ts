import type { UploadFile } from '@useupup/core'
import { SSEProcessor } from '@useupup/core/internal'

export type SSEProcessingOptions = {
    processingEndpoint?: string | undefined
    onFileProcessed?:
        ((file: UploadFile, data: Record<string, unknown>) => void) | undefined
    onError?: ((error: Error) => void) | undefined
    processingTimeout?: number | undefined
}

/**
 * Framework-free SSE processing helper (ported from @useupup/svelte useSSEProcessing).
 * Returns { connectSSE(file), destroy() }.
 * - connectSSE opens an EventSource at processingEndpoint?key=file.key.
 * - destroy tears down all open EventSources and timers.
 *
 * No Svelte lifecycle hooks — callers push destroy() into their own cleanup array.
 *
 * `onFileProcessed` is read from `options` each time it is needed, never
 * copied at setup, so a caller can hand in a getter and a handler that arrives
 * or changes after init (even while a stream is open) is the one that hears it.
 */
export function createSSEProcessing(options: SSEProcessingOptions): {
    connectSSE(file: UploadFile): void
    destroy(): void
} {
    const { processingEndpoint, onError, processingTimeout = 60_000 } = options
    const processor = new SSEProcessor()
    let destroyed = false

    function connectSSE(file: UploadFile): void {
        const key = file.key
        if (!processingEndpoint || !options.onFileProcessed || !key) return

        processor.subscribe(
            key,
            processingEndpoint,
            (data: Record<string, unknown>) => {
                options.onFileProcessed?.(file, data)
            },
            (error: Error) => onError?.(error),
            processingTimeout,
        )
    }

    function destroy(): void {
        if (destroyed) return
        destroyed = true
        processor.destroy()
    }

    return { connectSSE, destroy }
}
