import { PublicClientApplication } from '@azure/msal-browser'
import { useEffect, useState } from 'react'

const usePCAInstance = (clientId: string) => {
    const [msalInstance, setMsalInstance] =
        useState<PublicClientApplication | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        const initializeMsal = async () => {
            try {
                const instance = new PublicClientApplication({
                    auth: {
                        clientId,
                        authority: 'https://login.microsoftonline.com/common',
                        redirectUri: window.location.origin,
                        postLogoutRedirectUri: window.location.origin,
                        navigateToLoginRequestUrl: false,
                    },
                    cache: {
                        cacheLocation: 'sessionStorage',
                        storeAuthStateInCookie: true,
                    },
                    system: {
                        allowRedirectInIframe: true,
                        windowHashTimeout: 60000,
                        iframeHashTimeout: 6000,
                        loadFrameTimeout: 6000,
                    },
                })

                await instance.initialize()
                setMsalInstance(instance)
            } catch (error) {
                console.error('Failed to initialize MSAL:', error)
            } finally {
                setIsInitializing(false)
            }
        }

        if (!msalInstance) {
            initializeMsal()
        }
    }, [clientId])

    return {
        msalInstance,
        isInitializing,
    }
}

export default usePCAInstance
