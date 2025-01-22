import { PublicClientApplication } from '@azure/msal-browser'
import { useEffect, useState } from 'react'
import { useRootContext } from '../context/RootContext'

const usePCAInstance = (clientId: string) => {
    const {
        props: { onError },
    } = useRootContext()
    const [msalInstance, setMsalInstance] = useState<PublicClientApplication>()
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        let mounted = true

        const initializeMsal = async () => {
            if (!clientId) {
                setIsInitializing(false)
                onError('Client ID is required...')
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

                if (mounted) setMsalInstance(instance)
            } catch (error) {
                onError((error as Error).message)
            } finally {
                if (mounted) setIsInitializing(false)
            }
        }

        if (!msalInstance) initializeMsal()

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
