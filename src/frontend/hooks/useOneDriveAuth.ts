import {
    AuthenticationResult,
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
import { useRootContext } from '../context/RootContext'
import { createSecureStorage } from '../lib/storageHelper'

type Props = {
    msalInstance?: PublicClientApplication
    setUser: Dispatch<SetStateAction<MicrosoftUser | undefined>>
    setOneDriveFiles: Dispatch<SetStateAction<OneDriveRoot | undefined>>
}

const secureStorage = createSecureStorage()

export default function useOneDriveAuth({
    msalInstance,
    setUser,
    setOneDriveFiles,
}: Props) {
    const {
        props: { onError },
    } = useRootContext()
    const [token, setToken] = useState<MicrosoftToken>()
    const [isInitialized, setIsInitialized] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [isAuthInProgress, setIsAuthInProgress] = useState(false)

    // Initialize MSAL
    useEffect(() => {
        const initialize = async () => {
            if (!msalInstance || isInitialized) return

            try {
                await msalInstance.initialize()
                setIsInitialized(true)

                // Check for existing token after initialization
                const accounts = msalInstance.getAllAccounts()
                if (accounts.length > 0) {
                    try {
                        const silentRequest = {
                            scopes: [
                                'user.read',
                                'Files.ReadWrite.All',
                                'Files.Read.All',
                            ],
                            account: accounts[0],
                        }
                        const response =
                            await msalInstance.acquireTokenSilent(silentRequest)
                        if (response)
                            setToken({
                                secret: response.accessToken,
                                expiresOn: response.expiresOn!.getTime(),
                            })
                    } catch (error) {
                        onError(
                            `Silent token acquisition failed: ${(error as Error)
                                ?.message}`,
                        ) // Silent token acquisition failed, user will need to sign in again
                    }
                }
            } catch (error) {
                onError(
                    `MSAL initialization failed: ${(error as Error)?.message}`,
                )
                setIsInitialized(false)
            }
        }

        initialize()
    }, [isInitialized, msalInstance, onError])

    const signIn =
        useCallback(async (): Promise<AuthenticationResult | null> => {
            if (
                !msalInstance ||
                !isInitialized ||
                isAuthenticating ||
                isAuthInProgress
            )
                return null

            const loginRequest: PopupRequest = {
                scopes: ['user.read', 'Files.ReadWrite.All', 'Files.Read.All'],
                prompt: 'select_account',
            }

            try {
                setIsAuthInProgress(true)
                setIsAuthenticating(true)

                const accounts = msalInstance.getAllAccounts()
                if (accounts.length > 0) {
                    try {
                        // Attempt silent token acquisition first
                        return await msalInstance.acquireTokenSilent({
                            ...loginRequest,
                            account: accounts[0],
                        })
                    } catch (error) {
                        onError(
                            'Silent token acquisition failed, proceeding with interactive login' +
                                (error as Error)?.message,
                        ) // Silent token acquisition failed, fall through to interactive login
                    }
                }

                // If silent token acquisition fails, try interactive login
                const loginResponse =
                    await msalInstance.loginPopup(loginRequest)

                if (loginResponse)
                    return await msalInstance.acquireTokenSilent({
                        ...loginRequest,
                        account: loginResponse.account,
                    })

                return null
            } catch (error) {
                onError(`Sign-in failed: ${(error as Error)?.message}`)
                return null
            } finally {
                setIsAuthenticating(false)
                setIsAuthInProgress(false)
            }
        }, [
            msalInstance,
            isInitialized,
            isAuthenticating,
            isAuthInProgress,
            onError,
        ])

    const handleSignIn = useCallback(async () => {
        if (!isInitialized || isAuthenticating || isAuthInProgress) return

        try {
            const response = await signIn()
            if (response) {
                const newToken: MicrosoftToken = {
                    secret: response.accessToken,
                    expiresOn: response.expiresOn!.getTime(),
                }
                setToken(newToken)
                secureStorage.setItem('isAuthenticated', 'true')
            }
        } catch (error) {
            onError(`Handle sign-in failed: ${(error as Error)?.message}`)
            setToken(undefined)
            secureStorage.removeItem('isAuthenticated')
        }
    }, [isInitialized, isAuthenticating, isAuthInProgress, signIn, onError])

    const handleSignOut = useCallback(async () => {
        if (!msalInstance || !isInitialized || isAuthInProgress) return

        try {
            setIsAuthInProgress(true)
            const accounts = msalInstance.getAllAccounts()

            if (accounts.length > 0) {
                // Wait for the logout to complete
                await msalInstance.logoutPopup({
                    account: accounts[0],
                    postLogoutRedirectUri: window.location.origin,
                })
            }

            // Clear all local state
            setToken(undefined)
            setUser(undefined)
            setOneDriveFiles(undefined)

            // Clear MSAL cache
            msalInstance.clearCache()

            // Set logout flag in session storage
            secureStorage.setItem('recentLogout', 'true')

            // Clear remaining session storage
            secureStorage.removeItem('isAuthenticated')
        } catch (error) {
            onError(`Sign-out failed: ${(error as Error)?.message}`)
        } finally {
            setIsAuthInProgress(false)
            // Clear the logout flag after a short delay
            setTimeout(() => secureStorage.removeItem('recentLogout'), 1000) // Adjust timeout as needed
        }
    }, [
        msalInstance,
        isInitialized,
        isAuthInProgress,
        setUser,
        setOneDriveFiles,
        onError,
    ])

    // Modify the auto-login effect
    useEffect(() => {
        if (!isInitialized || isAuthenticating || isAuthInProgress || token)
            return

        let autoLoginTimeout: ReturnType<typeof setTimeout>

        const autoLogin = async () => {
            // Check for recent logout or existing authentication
            const hasRecentlyLoggedOut = secureStorage.getItem('recentLogout')
            const isAuthenticated = secureStorage.getItem('isAuthenticated')

            if (hasRecentlyLoggedOut || isAuthenticated) return

            const accounts = msalInstance?.getAllAccounts() || []
            if (accounts.length === 0)
                autoLoginTimeout = setTimeout(() => {
                    handleSignIn()
                }, 1000)
        }

        autoLogin()

        return () => {
            if (autoLoginTimeout) clearTimeout(autoLoginTimeout)
        }
    }, [
        isInitialized,
        isAuthenticating,
        isAuthInProgress,
        token,
        handleSignIn,
        msalInstance,
    ])

    return {
        token,
        signOut: handleSignOut,
        isInitialized,
        isAuthenticating,
    }
}
