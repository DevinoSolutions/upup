import { ref, onMounted } from 'vue'
import load from 'load-script'

/**
 * Loads the Google Identity Services API script.
 */
export default function useLoadGAPI() {
    const gisLoaded = ref(false)

    onMounted(() => {
        if (gisLoaded.value) return
        load('https://accounts.google.com/gsi/client', (err: Error | null) => {
            if (!err) gisLoaded.value = true
        })
    })

    return { gisLoaded }
}
