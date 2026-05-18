import load from 'load-script'

let gisPromise: Promise<void> | null = null

/**
 * Loads the Google Identity Services (GIS) API script.
 * Cached — only loads once per page lifecycle.
 */
export function loadGoogleIdentityServices(): Promise<void> {
    if (gisPromise) return gisPromise
    gisPromise = new Promise((resolve, reject) => {
        load('https://accounts.google.com/gsi/client', (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
    return gisPromise
}
