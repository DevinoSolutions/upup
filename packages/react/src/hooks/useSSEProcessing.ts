import { useCallback, useEffect, useRef } from 'react'
import type { UploadFile } from '@upup/core'
import { SSEProcessor } from '@upup/core'

type Options = {
    processingEndpoint?: string
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
    onError?: (error: Error) => void
    processingTimeout?: number
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
}: Options) {
    const processorRef = useRef(new SSEProcessor())

    useEffect(() => {
        const processor = processorRef.current
        return () => processor.destroy()
    }, [])

    const connectSSE = useCallback(
        (file: UploadFile) => {
            const key = file.key
            if (!processingEndpoint || !onFileProcessed || !key) return

            processorRef.current.subscribe(
                key,
                processingEndpoint,
                (data: Record<string, unknown>) => onFileProcessed(file, data),
                (error: Error) => onError?.(error),
                processingTimeout,
            )
        },
        [processingEndpoint, onFileProcessed, onError, processingTimeout],
    )

    return { connectSSE }
}
