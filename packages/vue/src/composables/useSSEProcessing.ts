import { onUnmounted } from 'vue'
import type { UploadFile } from '@useupup/core'
import { SSEProcessor } from '@useupup/core/internal'

type Options = {
    processingEndpoint?: string | undefined
    onFileProcessed?:
        ((file: UploadFile, data: Record<string, unknown>) => void) | undefined
    onError?: ((error: Error) => void) | undefined
    processingTimeout?: number | undefined
}

/**
 * Manages server-sent event connections opened after each file upload.
 * When `processingEndpoint` is set, calling `connectSSE(file)` opens an
 * EventSource at `${processingEndpoint}?key=${file.key}`. The first message
 * received is parsed as JSON and forwarded to `onFileProcessed`. The
 * connection is closed automatically on message, error, or timeout.
 */
export function useSSEProcessing({
    processingEndpoint,
    onFileProcessed,
    onError,
    processingTimeout = 60_000,
}: Options): { connectSSE: (file: UploadFile) => void } {
    const processor = new SSEProcessor()

    onUnmounted(() => {
        processor.destroy()
    })

    function connectSSE(file: UploadFile) {
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

    return { connectSSE }
}
