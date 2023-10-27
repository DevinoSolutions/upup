import { AuthenticationResult, PopupRequest } from '@azure/msal-browser'
import { useCallback, useEffect, useState } from 'react'
import { MicrosoftToken, MicrosoftUser } from 'microsoft'
import usePCAInstance from './usePCAInstance'

const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0/me'
const TOKEN_STORAGE_KEY = 'onedrive_token'
const GRAPH_API_FILES_ENDPOINT =
    'https://graph.microsoft.com/v1.0/me/drive/root/children'

interface AuthProps {
    token: MicrosoftToken | undefined
    user: MicrosoftUser | undefined
    fileList: any[] | undefined
}

function useOneDriveAuth(clientId: string): AuthProps {
    const [token, setToken] = useState<MicrosoftToken | undefined>()
    const [user, setUser] = useState<MicrosoftUser | undefined>()
    const [fileList, setFileList] = useState<any[]>([])
    const { msalInstance } = usePCAInstance(clientId)

    const getStoredToken = (): MicrosoftToken | null => {
        const storedTokenStr = localStorage.getItem(TOKEN_STORAGE_KEY)
        return storedTokenStr ? JSON.parse(storedTokenStr) : null
    }

    const fetchFileList = useCallback(async (accessToken: string) => {
        const response = await fetch(GRAPH_API_FILES_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch file list')
        }

        const data = await response.json()
        return data.value // The list of files is usually inside the "value" property of the response
    }, [])

    const fetchProfileInfo = useCallback(async (accessToken: string) => {
        const response = await fetch(GRAPH_API_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch profile info')
        }

        return response.json()
    }, [])

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
                }
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

    useEffect(() => {
        if (token) {
            ;(async () => {
                const profile = await fetchProfileInfo(token.access_token)
                setUser({
                    displayName: profile.displayName,
                    mail: profile.mail,
                })
            })()
        }
    }, [token, fetchProfileInfo])

    useEffect(() => {
        if (token) {
            ;(async () => {
                const files = await fetchFileList(token.access_token)
                setFileList(files)
            })()
        }
    }, [token, fetchFileList])

    return { token, user, fileList }
}

export default useOneDriveAuth
