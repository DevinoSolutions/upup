import { loadGoogleIdentityServices } from '@upup/core'
import { useEffect, useState } from 'react'

/**
 * Loads the Google Identity Services API.
 */
export default function useLoadGAPI() {
    const [gisLoaded, setGisLoaded] = useState<boolean>(false)

    useEffect(() => {
        loadGoogleIdentityServices()
            .then(() => setGisLoaded(true))
            .catch(() => {/* silently ignore — caller checks gisLoaded */})
    }, [])

    return { gisLoaded }
}
