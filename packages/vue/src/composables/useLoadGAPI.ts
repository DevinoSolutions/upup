import { loadGoogleIdentityServices } from '@upup/core'
import { ref, onMounted } from 'vue'

/**
 * Loads the Google Identity Services API.
 */
export default function useLoadGAPI() {
    const gisLoaded = ref(false)

    onMounted(() => {
        loadGoogleIdentityServices()
            .then(() => {
                gisLoaded.value = true
            })
            .catch(() => {
                /* silently ignore — caller checks gisLoaded */
            })
    })

    return { gisLoaded }
}
