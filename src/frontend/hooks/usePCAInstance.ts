import { PublicClientApplication } from '@azure/msal-browser'
import { useEffect, useState } from 'react'

const usePCAInstance = (clientId: string) => {
    const [msalInstance, setMsalInstance] =
        useState<PublicClientApplication | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        let mounted = true

        const initializeMsal = async () => {
            if (!clientId) {
                setIsInitializing(false)
                console.error('Client ID is required...')
                return
            }

            try {
                const instance = new PublicClientApplication({
                    auth: {
                        clientId,
                        authority: 'https://login.microsoftonline.com/common',
                        redirectUri: window.location.origin,
                        navigateToLoginRequestUrl: true,
                    },
                    cache: {
                        cacheLocation: 'localStorage',
                        storeAuthStateInCookie: true,
                    },
                    system: {
                        allowRedirectInIframe: true,
                        windowHashTimeout: 60000,
                        iframeHashTimeout: 10000,
                        loadFrameTimeout: 10000,
                        asyncPopups: false,
                    },
                })

                if (mounted) {
                    setMsalInstance(instance)
                }
            } catch (error) {
            } finally {
                if (mounted) {
                    setIsInitializing(false)
                }
            }
        }

        if (!msalInstance) {
            initializeMsal()
        }

        return () => {
            mounted = false
        }
    }, [clientId])

    return {
        msalInstance,
        isInitializing,
    }
}

export default usePCAInstance
