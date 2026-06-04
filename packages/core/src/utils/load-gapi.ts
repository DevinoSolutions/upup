import load from 'load-script'

let gisPromise: Promise<void> | null = null

/**
 * Loads the Google Identity Services (GIS) API script.
 * Cached — only loads once per page lifecycle.
 */
export function loadGoogleIdentityServices(): Promise<void> {
    if (typeof window !== 'undefined') {
        const google = (window as Window & { google?: any }).google
        if (google?.accounts?.oauth2?.initTokenClient) {
            return Promise.resolve()
        }
    }
    if (gisPromise) return gisPromise
    gisPromise = new Promise((resolve, reject) => {
        load('https://accounts.google.com/gsi/client', (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
    return gisPromise
}
