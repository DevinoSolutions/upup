import { useCallback, useState } from 'react'
import { sanitizeFileName, extensionFromMime, fileNameFromContentDisposition, deriveFetchedFileName } from '@upup/core'
import { useUploaderOptions, useUploaderRuntime } from '../context/RootContext'

export { deriveFetchedFileName }

export default function useFetchFileByUrl() {
    const { core } = useUploaderRuntime()
    const { onError } = useUploaderOptions()
    const [loading, setLoading] = useState(false)

    const fetchImage = useCallback(
        async (url: string) => {
            if (loading) return

            try {
                setLoading(true)
                const response = await fetch(url)
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
                onError((error as Error).message)
                return
            } finally {
                setLoading(false)
            }
        },
        [core, loading, onError],
    )

    return { loading, fetchImage }
}
