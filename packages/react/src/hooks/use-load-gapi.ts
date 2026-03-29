'use client'

import { useEffect, useState } from 'react'

/**
 * Loads the Google Identity Services (GIS) script dynamically.
 */
export default function useLoadGAPI() {
    const [gisLoaded, setGisLoaded] = useState<boolean>(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        // Already loaded
        if ((window as any).google?.accounts) {
            setGisLoaded(true)
            return
        }

        const scriptId = '__upup_gsi_client__'
        if (document.getElementById(scriptId)) {
            // Script is loading, poll for readiness
            const interval = setInterval(() => {
                if ((window as any).google?.accounts) {
                    setGisLoaded(true)
                    clearInterval(interval)
                }
            }, 100)
            return () => clearInterval(interval)
        }

        const script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => setGisLoaded(true)
        document.head.appendChild(script)
    }, [])

    return { gisLoaded }
}
