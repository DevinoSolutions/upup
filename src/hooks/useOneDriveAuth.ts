import {
    AuthenticationResult,
    PopupRequest,
    PublicClientApplication,
} from '@azure/msal-browser'
import { useEffect, useState } from 'react'
import { MicrosoftToken, MicrosoftUser } from 'microsoft'

function useOneDriveAuth(clientId: string) {
    const [token, setToken] = useState<MicrosoftToken>()
    const [user, setUser] = useState<MicrosoftUser>()

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

    const fetchProfileInfo = async (token: string) => {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch profile info')
        }

        return await response.json()
    }

    const handleSignIn = async () => {
        const result = await signIn()
        result && (await acquireToken())
    }

    useEffect(() => {
        /**
         * @description Initialize the one Drive API
         * @returns {Promise<void>}
         */
        const storedTokenStr = localStorage.getItem('onedrive_token')
        const storedToken = storedTokenStr ? JSON.parse(storedTokenStr) : null
        if (storedToken && storedToken.expires_in > Date.now())
            return setToken(storedToken)
        else {
            ;(async () => await handleSignIn())()
        }
    }, [])

    useEffect(() => {
        if (token) {
            ;(async () => {
                const profile = await fetchProfileInfo(token.access_token)
                setUser(profile)
            })()
        }
    }, [token])

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
                    access_token: response.accessToken,
                    expires_in: response.expiresOn!.getTime(),
                }
                localStorage.setItem(
                    'onedrive_token',
                    JSON.stringify(storeToken),
                )
                setToken(storeToken)
            }
        } catch (error) {
            console.error('Error during token acquisition:', error)
        }
    }

    return { token, user }
}

export default useOneDriveAuth
