import { useCallback, useEffect, useRef, useState } from 'react'
import {
    sanitizeFileName,
    extensionFromMime,
    fileNameFromContentDisposition,
    deriveFetchedFileName,
} from '@upup/core'
import {
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/UploaderContext'

export { deriveFetchedFileName }

export default function useFetchFileByUrl() {
    const { core } = useUploaderRuntime()
    const { onError } = useUploaderOptions()
    const [loading, setLoading] = useState(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    const mountedRef = useRef(true)

    const cancelFetch = useCallback(() => {
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
    }, [])

    // Abort any in-flight fetch on unmount so we never setState after teardown.
    useEffect(() => {
        return () => {
            mountedRef.current = false
            cancelFetch()
        }
    }, [cancelFetch])

    const fetchImage = useCallback(
        async (url: string) => {
            if (loading) return
            const abortController = new AbortController()
            abortControllerRef.current = abortController

            try {
                setLoading(true)
                const response = await fetch(url, {
                    signal: abortController.signal,
                })
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL: ${response.status}`)
                }
                const blob = await response.blob()
                const fileName = deriveFetchedFileName(url, response, blob)

                const file = new File([blob], fileName, {
                    type: blob.type,
                })

                core?.emit('url-fetch', { file })
                return file
            } catch (error) {
                if ((error as Error).name === 'AbortError') {
                    core?.emit('url-fetch-cancel', { url })
                    return
                }
                onError((error as Error).message)
                return
            } finally {
                if (abortControllerRef.current === abortController) {
                    abortControllerRef.current = null
                }
                if (mountedRef.current) {
                    setLoading(false)
                }
            }
        },
        [core, loading, onError],
    )

    return { loading, fetchImage, cancelFetch }
}
