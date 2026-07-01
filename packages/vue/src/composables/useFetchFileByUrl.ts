import { ref } from 'vue'
import { sanitizeFileName, extensionFromMime, fileNameFromContentDisposition, deriveFetchedFileName } from '@upup/core'
import { useUploaderOptions, useUploaderRuntime } from '../context/uploader-context'

export { deriveFetchedFileName }

export default function useFetchFileByUrl() {
    const { core } = useUploaderRuntime()
    const { onError } = useUploaderOptions()
    const loading = ref(false)

    async function fetchImage(url: string) {
        if (loading.value) return

        try {
            loading.value = true
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status}`)
            }
            const blob = await response.blob()
            const fileName = deriveFetchedFileName(url, response, blob)

            const file = new File([blob], fileName, { type: blob.type })

            core?.emit('url-fetch', { file })
            return file
        } catch (error) {
            onError((error as Error).message)
            return undefined
        } finally {
            loading.value = false
        }
    }

    return { loading, fetchImage }
}
