import type { UploadFile } from '@upup/core'
import { SSEProcessor } from '@upup/core/internal'

export type SSEProcessingOptions = {
    processingEndpoint?: string | undefined
    onFileProcessed?:
        ((file: UploadFile, data: Record<string, unknown>) => void) | undefined
    onError?: ((error: Error) => void) | undefined
    processingTimeout?: number | undefined
}

/**
 * Framework-free SSE processing helper (ported from @upup/svelte useSSEProcessing).
 * Returns { connectSSE(file), destroy() }.
 * - connectSSE opens an EventSource at processingEndpoint?key=file.key.
 * - destroy tears down all open EventSources and timers.
 *
 * No Svelte lifecycle hooks — callers push destroy() into their own cleanup array.
 */
export function createSSEProcessing({
    processingEndpoint,
    onFileProcessed,
    onError,
    processingTimeout = 60_000,
}: SSEProcessingOptions): {
    connectSSE(file: UploadFile): void
    destroy(): void
} {
    const processor = new SSEProcessor()
    let destroyed = false

    function connectSSE(file: UploadFile): void {
        const key = file.key
        if (!processingEndpoint || !onFileProcessed || !key) return

        processor.subscribe(
            key,
            processingEndpoint,
            (data: Record<string, unknown>) => {
                onFileProcessed(file, data)
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
