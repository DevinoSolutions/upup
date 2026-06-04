import { onScopeDispose, ref } from 'vue'
import { sanitizeFileName, extensionFromMime, fileNameFromContentDisposition, deriveFetchedFileName } from '@upup/core'
import { useUploaderOptions, useUploaderRuntime } from '../context/root-context'

export { deriveFetchedFileName }

export default function useFetchFileByUrl() {
    const { core } = useUploaderRuntime()
    const { onError } = useUploaderOptions()
    const loading = ref(false)
    let abortController: AbortController | null = null

    function cancelFetch() {
        abortController?.abort()
        abortController = null
    }

    onScopeDispose(cancelFetch)

    async function fetchImage(url: string) {
        if (loading.value) return
        const currentAbortController = new AbortController()
        abortController = currentAbortController

        try {
            loading.value = true
            const response = await fetch(url, {
                signal: currentAbortController.signal,
            })
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status}`)
            }
            const blob = await response.blob()
            const fileName = deriveFetchedFileName(url, response, blob)

            const file = new File([blob], fileName, { type: blob.type })

            core?.emit('url-fetch', { file })
            return file
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                core?.emit('url-fetch-cancel', { url })
                return undefined
            }
            onError((error as Error).message)
            return undefined
        } finally {
            if (abortController === currentAbortController) {
                abortController = null
            }
            loading.value = false
        }
    }

    return { loading, fetchImage, cancelFetch }
}
