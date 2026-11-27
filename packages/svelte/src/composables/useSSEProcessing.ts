import { onDestroy } from 'svelte'
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
 *
 * `onFileProcessed` is read from `options` each time it is needed, never
 * copied at setup, so a caller can hand in a getter and a handler that arrives
 * or changes after mount (even while a stream is open) is the one that hears it.
 */
export interface UseSSEProcessingReturn {
    connectSSE: (file: UploadFile) => void
}

export function useSSEProcessing(options: Options): UseSSEProcessingReturn {
    const { processingEndpoint, onError, processingTimeout = 60_000 } = options
    const processor = new SSEProcessor()

    onDestroy(() => {
        processor.destroy()
    })

    function connectSSE(file: UploadFile) {
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

    return { connectSSE }
}
