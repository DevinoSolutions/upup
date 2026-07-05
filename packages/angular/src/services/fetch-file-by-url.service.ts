import { Injectable, inject, signal } from '@angular/core'
import { deriveFetchedFileName } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'

export { deriveFetchedFileName }

/**
 * Angular port of useFetchFileByUrl (svelte/vue composable).
 *
 * Fetches a URL → Blob → File using deriveFetchedFileName for the filename.
 * Error path calls store.uiProps.onError (svelte parity: composable uses onError
 * from useUploaderOptions which resolves to the same callback).
 */
@Injectable()
export class FetchFileByUrlService {
    private store = inject(UpupStore)

    readonly loading = signal(false)

    async fetchImage(url: string): Promise<File | undefined> {
        if (this.loading()) return undefined

        try {
            this.loading.set(true)
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status}`)
            }
            const blob = await response.blob()
            const fileName = deriveFetchedFileName(url, response, blob)
            const file = new File([blob], fileName, { type: blob.type })
            this.store.core?.emit('url-fetch', { file })
            return file
        } catch (error) {
            this.store.uiProps.onError((error as Error).message)
            return undefined
        } finally {
            this.loading.set(false)
        }
    }
}
