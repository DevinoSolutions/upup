import { onMount } from 'svelte'
import { writable } from 'svelte/store'
import { loadGoogleIdentityServices } from '@upup/core/internal'

/**
 * Loads the Google Identity Services API.
 * SSR-safe: the script load only happens in onMount (browser-only).
 */
export default function useLoadGAPI() {
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
