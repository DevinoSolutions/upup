import { useCallback, useEffect, useRef } from 'react'
import type { UploadFile } from '@upup/core'

type Options = {
    processingEndpoint?: string
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
    onError?: (error: Error) => void
    processingTimeout?: number
}

function withProcessingKey(endpoint: string, key: string): string {
    const hashIndex = endpoint.indexOf('#')
    const beforeHash = hashIndex >= 0 ? endpoint.slice(0, hashIndex) : endpoint
    const hash = hashIndex >= 0 ? endpoint.slice(hashIndex) : ''
    const queryIndex = beforeHash.indexOf('?')
    const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash
    const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : ''
    const params = new URLSearchParams(query)
    params.set('key', key)
    return `${path}?${params.toString()}${hash}`
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
    const sourcesRef = useRef<Map<string, EventSource>>(new Map())

    const connectSSE = useCallback(
        (file: UploadFile) => {
            const key = file.key
            if (!processingEndpoint || !onFileProcessed || !key) return

            const source = new EventSource(withProcessingKey(processingEndpoint, key))
            sourcesRef.current.set(key, source)

            const cleanup = () => {
                source.close()
                sourcesRef.current.delete(key)
            }

            const timer = setTimeout(() => {
                onError?.(new Error(`Processing timed out for ${key}`))
                cleanup()
            }, processingTimeout)

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
                onError?.(new Error(`Processing stream failed for ${key}`))
                cleanup()
            }
        },
        [processingEndpoint, onFileProcessed, onError, processingTimeout],
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
