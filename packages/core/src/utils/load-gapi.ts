const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let gisPromise: Promise<void> | null = null

/**
 * Loads the Google Identity Services (GIS) API script.
 * Cached — only loads once per page lifecycle.
 */
export function loadGoogleIdentityServices(): Promise<void> {
    if (gisPromise) return gisPromise
    gisPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${GIS_SCRIPT_SRC}"]`,
        )
        if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () =>
                reject(new Error(`Failed to load script: ${GIS_SCRIPT_SRC}`)),
            )
            return
        }
        const script = document.createElement('script')
        script.src = GIS_SCRIPT_SRC
        script.async = true
        script.onload = () => resolve()
        script.onerror = () =>
            reject(new Error(`Failed to load script: ${GIS_SCRIPT_SRC}`))
        document.head.appendChild(script)
    })
    return gisPromise
}
