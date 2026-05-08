import { useCallback, useEffect, useRef } from 'react'
import type { UploadFile } from '@upup/core'

type Options = {
    processingEndpoint?: string
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
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
    processingTimeout = 60_000,
}: Options) {
    const sourcesRef = useRef<Map<string, EventSource>>(new Map())

    const connectSSE = useCallback(
        (file: UploadFile) => {
            const key = file.key
            if (!processingEndpoint || !onFileProcessed || !key) return

            const url = `${processingEndpoint}?key=${encodeURIComponent(key)}`
            const source = new EventSource(url)
            sourcesRef.current.set(key, source)

            const cleanup = () => {
                source.close()
                sourcesRef.current.delete(key)
            }

            const timer = setTimeout(cleanup, processingTimeout)

            source.onmessage = (event) => {
                clearTimeout(timer)
                let data: Record<string, unknown>
                try {
                    data = JSON.parse(event.data) as Record<string, unknown>
                } catch {
                    data = { raw: event.data }
                }
                onFileProcessed(file, data)
                cleanup()
            }

            source.onerror = () => {
                clearTimeout(timer)
                cleanup()
            }
        },
        [processingEndpoint, onFileProcessed, processingTimeout],
    )

    // Close all open connections on unmount
    useEffect(() => {
        const sources = sourcesRef.current
        return () => {
            sources.forEach(s => s.close())
            sources.clear()
        }
    }, [])

    return { connectSSE }
}
