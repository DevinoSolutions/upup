import { onMount } from 'svelte'
import { writable, type Writable } from 'svelte/store'
import { loadGoogleIdentityServices } from '@upup/core/internal'

export interface UseLoadGAPIReturn {
    gisLoaded: Writable<boolean>
}

/**
 * Loads the Google Identity Services API.
 * SSR-safe: the script load only happens in onMount (browser-only).
 */
export default function useLoadGAPI(): UseLoadGAPIReturn {
    const gisLoaded = writable(false)

    onMount(() => {
        loadGoogleIdentityServices()
            .then(() => {
                gisLoaded.set(true)
            })
            .catch(() => {
                /* silently ignore — caller checks gisLoaded */
            })
    })

    return { gisLoaded }
}
