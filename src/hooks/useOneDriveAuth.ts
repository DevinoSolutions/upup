import {
    AuthenticationResult,
    InteractionRequiredAuthError,
    PopupRequest,
    PublicClientApplication,
} from '@azure/msal-browser'
import { MicrosoftToken, MicrosoftUser, OneDriveRoot } from 'microsoft'
import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useState,
} from 'react'

const TOKEN_STORAGE_KEY = 'oneDriveToken'

type Props = {
    msalInstance: PublicClientApplication | null
    setUser: Dispatch<SetStateAction<MicrosoftUser | undefined>>
    setOneDriveFiles: Dispatch<SetStateAction<OneDriveRoot | undefined>>
}

const getStoredToken = (): MicrosoftToken | null => {
    try {
        const storedTokenObject = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (!storedTokenObject) return null

        const storedToken = JSON.parse(storedTokenObject)
        // Check if token is expired
        if (storedToken.expiresOn < Date.now()) {
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            return null
        }
        return storedToken
    } catch (error) {
        console.error('Error reading stored token:', error)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        return null
    }
}

export default function useOneDriveAuth({
    msalInstance,
    setUser,
    setOneDriveFiles,
}: Props) {
    const [token, setToken] = useState<MicrosoftToken | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(false)

    // Initialize MSAL
    useEffect(() => {
        const initialize = async () => {
            if (!msalInstance || isInitialized) return

            try {
                await msalInstance.initialize()
                setIsInitialized(true)

                // Check for existing token after initialization
                const storedToken = getStoredToken()
                if (storedToken) {
                    setToken(storedToken)
                }
            } catch (error) {
                console.error('Failed to initialize MSAL:', error)
                setIsInitialized(false)
            }
        }

        initialize()
    }, [msalInstance])

    const signIn =
        useCallback(async (): Promise<AuthenticationResult | null> => {
            if (!msalInstance || !isInitialized || isAuthenticating) return null

            const loginRequest: PopupRequest = {
                scopes: ['user.read', 'Files.ReadWrite.All', 'Files.Read.All'],
                prompt: 'select_account',
            }

            try {
                setIsAuthenticating(true)
                const accounts = msalInstance.getAllAccounts()

                if (accounts.length > 0) {
                    try {
                        return await msalInstance.acquireTokenSilent({
                            ...loginRequest,
                            account: accounts[0],
                        })
                    } catch (silentError) {
                        if (
                            silentError instanceof InteractionRequiredAuthError
                        ) {
                            return await msalInstance.acquireTokenPopup(
                                loginRequest,
                            )
                        }
                        throw silentError
                    }
                } else {
                    return await msalInstance.loginPopup(loginRequest)
                }
            } catch (error) {
                console.error('Authentication error:', error)
                return null
            } finally {
                setIsAuthenticating(false)
            }
        }, [msalInstance, isInitialized, isAuthenticating])

    const handleSignIn = useCallback(async () => {
        if (!isInitialized || isAuthenticating) return

        try {
            await msalInstance?.handleRedirectPromise()
            const response = await signIn()

            if (response) {
                const newToken: MicrosoftToken = {
                    secret: response.accessToken,
                    expiresOn: response.expiresOn!.getTime(),
                }
                setToken(newToken)
                localStorage.setItem(
                    TOKEN_STORAGE_KEY,
                    JSON.stringify(newToken),
                )
            }
        } catch (error) {
            console.error('Sign in error:', error)
            handleSignOut()
        }
    }, [msalInstance, signIn, isInitialized, isAuthenticating])

    const handleSignOut = useCallback(() => {
        if (!msalInstance || !isInitialized) return

        try {
            msalInstance.logoutPopup()
            setToken(null)
            setUser(undefined)
            setOneDriveFiles(undefined)
            localStorage.removeItem(TOKEN_STORAGE_KEY)
        } catch (error) {
            console.error('Logout error:', error)
        }
    }, [msalInstance, isInitialized, setUser, setOneDriveFiles])

    // Auto-login if no token is present
    useEffect(() => {
        if (!isInitialized || isAuthenticating || token) return

        handleSignIn()
    }, [isInitialized, token, handleSignIn, isAuthenticating])

    return {
        token,
        signOut: handleSignOut,
        isInitialized,
        isAuthenticating,
    }
}
