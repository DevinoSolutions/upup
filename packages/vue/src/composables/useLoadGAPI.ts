import { loadGoogleIdentityServices } from '@upup/core/internal'
import { ref, onMounted, type Ref } from 'vue'

/**
 * Loads the Google Identity Services API.
 */
export default function useLoadGAPI(): { gisLoaded: Ref<boolean> } {
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
