import { useCallback, useEffect, useRef } from 'react'
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
 * The handler is read when the message lands, not when the stream opens, so a
 * handler swapped while a stream is open is the one that hears it.
 */
export function useSSEProcessing({
    processingEndpoint,
    onFileProcessed,
    onError,
    processingTimeout = 60_000,
}: Options): { connectSSE: (file: UploadFile) => void } {
    const processorRef = useRef(new SSEProcessor())
    const onFileProcessedRef = useRef(onFileProcessed)
    onFileProcessedRef.current = onFileProcessed

    useEffect(() => {
        const processor = processorRef.current
        return () => {
            processor.destroy()
        }
    }, [])

    const connectSSE = useCallback(
        (file: UploadFile) => {
            const key = file.key
            if (!processingEndpoint || !onFileProcessedRef.current || !key)
                return

            processorRef.current.subscribe(
                key,
                processingEndpoint,
                (data: Record<string, unknown>) => {
                    onFileProcessedRef.current?.(file, data)
                },
                (error: Error) => onError?.(error),
                processingTimeout,
            )
        },
        [processingEndpoint, onError, processingTimeout],
    )

    return { connectSSE }
}
