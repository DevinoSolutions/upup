import {
    AuthenticationResult,
    PopupRequest,
    PublicClientApplication,
} from '@azure/msal-browser'
import { useEffect, useState } from 'react'

function useOneDriveAuth(clientId: string) {
    const [token, setToken] = useState<any>()
    const pca = new PublicClientApplication({
        auth: {
            clientId: clientId,
            redirectUri: window.location.origin,
        },
        cache: {
            cacheLocation: 'sessionStorage',
            storeAuthStateInCookie: false,
        },
    })

    useEffect(() => {
        /**
         * @description Initialize the one Drive API
         * @returns {Promise<void>}
         */
        const storedTokenStr = localStorage.getItem('token')
        const storedToken = storedTokenStr ? JSON.parse(storedTokenStr) : null

        if (storedToken && storedToken.expires_in > Date.now()) {
            return setToken(storedToken)
        } else {
            ;(async () => await handleSignIn())()
        }
    }, [])

    const signIn = async (): Promise<AuthenticationResult | null> => {
        await pca.initialize()
        try {
            const loginRequest: PopupRequest = {
                scopes: ['user.read', 'Files.ReadWrite.All'],
                prompt: 'select_account',
            }
            return await pca.loginPopup(loginRequest)
        } catch (error) {
            console.error('Error during signIn:', error)
            return null
        }
    }

    const acquireToken = async () => {
        try {
            const accounts = pca.getAllAccounts()
            if (!accounts || accounts.length === 0) {
                throw new Error(
                    'No accounts available. Make sure to authenticate first.',
                )
            }
            const silentRequest: PopupRequest = {
                scopes: ['user.read', 'Files.ReadWrite.All'],
                account: accounts[0],
            }
            const response = await pca.acquireTokenSilent(silentRequest)
            if (response.accessToken) {
                const storeToken = {
                    accessToken: response.accessToken,
                    expires_in:
                        Date.now() +
                        (response.expiresOn?.getTime()! - 20) * 1000,
                }
                localStorage.setItem('token', JSON.stringify(storeToken))
                setToken(storeToken)
            }
        } catch (error) {
            console.error('Error during token acquisition:', error)
        }
    }

    const handleSignIn = async () => {
        const result = await signIn()
        result && (await acquireToken())
    }

    return { token }
}

export default useOneDriveAuth
