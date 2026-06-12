import type { UploadFile } from '@upup/core'
import { SSEProcessor } from '@upup/core'

export type SSEProcessingOptions = {
    processingEndpoint?: string
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
    onError?: (error: Error) => void
    processingTimeout?: number
}

/**
 * Framework-free SSE processing helper (ported from @upup/svelte useSSEProcessing).
 * Returns { connectSSE(file), dispose() }.
 * - connectSSE opens an EventSource at processingEndpoint?key=file.key.
 * - dispose tears down all open EventSources and timers.
 *
 * No Svelte lifecycle hooks — callers push dispose() into their own cleanup array.
 */
export function createSSEProcessing({
    processingEndpoint,
    onFileProcessed,
    onError,
    processingTimeout = 60_000,
}: SSEProcessingOptions): { connectSSE(file: UploadFile): void; dispose(): void } {
    const processor = new SSEProcessor()

    function connectSSE(file: UploadFile): void {
        const key = file.key
        if (!processingEndpoint || !onFileProcessed || !key) return

        processor.subscribe(
            key,
            processingEndpoint,
            (data: Record<string, unknown>) => onFileProcessed(file, data),
            (error: Error) => onError?.(error),
            processingTimeout,
        )
    }

    function dispose(): void {
        processor.destroy()
    }

    return { connectSSE, dispose }
}
