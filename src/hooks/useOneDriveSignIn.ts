import {
    AuthenticationResult,
    PopupRequest,
    PublicClientApplication,
} from '@azure/msal-browser'
import { useCallback, useEffect, useState } from 'react'
import { MicrosoftToken } from 'microsoft'

const TOKEN_STORAGE_KEY = 'onedrive_token'

const UseOneDriveSignIn = (msalInstance: PublicClientApplication) => {
    const [token, setToken] = useState<MicrosoftToken>()

    const getStoredToken = (): MicrosoftToken | null => {
        const storedTokenStr = localStorage.getItem(TOKEN_STORAGE_KEY)
        return storedTokenStr ? JSON.parse(storedTokenStr) : null
    }

    const signIn = async (): Promise<AuthenticationResult | null> => {
        try {
            const loginRequest: PopupRequest = {
                scopes: ['user.read', 'Files.ReadWrite.All'],
                prompt: 'select_account',
            }
            return await msalInstance.loginPopup(loginRequest)
        } catch (error) {
            console.error('Error during signIn:', error)
            return null
        }
    }

    const acquireToken = async () => {
        try {
            const accounts = msalInstance.getAllAccounts()
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts available. Authenticate first.')
            }
            const silentRequest: PopupRequest = {
                scopes: ['user.read', 'Files.ReadWrite.All'],
                account: accounts[0],
            }
            const response = await msalInstance.acquireTokenSilent(
                silentRequest,
            )
            if (response.accessToken) {
                const storeToken = {
                    access_token: response.accessToken,
                    expires_in: response.expiresOn!.getTime(),
                } as MicrosoftToken
                localStorage.setItem(
                    TOKEN_STORAGE_KEY,
                    JSON.stringify(storeToken),
                )
                setToken(storeToken)
            }
        } catch (error) {
            console.error('Error during token acquisition:', error)
        }
    }

    const handleSignIn = useCallback(async () => {
        msalInstance && (await msalInstance.initialize())
        const result = await signIn()
        result && (await acquireToken())
    }, [])

    useEffect(() => {
        const storedToken = getStoredToken()
        if (storedToken && storedToken.expires_in > Date.now())
            setToken(storedToken)
        else handleSignIn()
    }, [handleSignIn])

    return { token }
}

export default UseOneDriveSignIn
