import { PopupRequest, PublicClientApplication } from '@azure/msal-browser'
import { useConfigContext } from 'context/config-context'
import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useState,
} from 'react'
import { Adapter, MicrosoftUser, OneDriveRoot } from 'types'

const TOKEN_STORAGE_KEY = 'oneDriveToken'

type MicrosoftToken = {
    secret: string
    expiresOn: number
}

type Props = {
    msalInstance?: PublicClientApplication
    setUser: Dispatch<SetStateAction<MicrosoftUser | undefined>>
    setOneDriveFiles: Dispatch<SetStateAction<OneDriveRoot | undefined>>
}

const getStoredToken = () => {
    try {
        const storedTokenObject = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (!storedTokenObject) return

        const storedToken: MicrosoftToken = JSON.parse(storedTokenObject)

        // Check if token is expired
        if (storedToken.expiresOn < Date.now()) {
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            return
        }

        return storedToken
    } catch (error) {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        return
    }
}

export default function useOneDriveAuth({
    msalInstance,
    setUser,
    setOneDriveFiles,
}: Props) {
    const { setActiveAdapter } = useConfigContext()
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
                const storedToken = getStoredToken()
                if (storedToken) setToken(storedToken)
            } catch (error) {
                setIsInitialized(false)
            }
        }

        initialize()
    }, [msalInstance])

    const signIn = useCallback(async () => {
        if (
            !msalInstance ||
            !isInitialized ||
            isAuthenticating ||
            isAuthInProgress
        )
            return

        const loginRequest: PopupRequest = {
            scopes: ['user.read', 'Files.ReadWrite.All', 'Files.Read.All'],
            prompt: 'select_account',
        }

        try {
            setIsAuthInProgress(true)
            setIsAuthenticating(true)

            const accounts = msalInstance.getAllAccounts()
            if (accounts.length > 0)
                return await msalInstance.acquireTokenSilent({
                    ...loginRequest,
                    account: accounts[0],
                })

            // If silent token acquisition fails, try interactive login
            const loginResponse = await msalInstance.loginPopup(loginRequest)
            if (!loginResponse) return

            return await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: loginResponse.account,
            })
        } catch (error) {
            return
        } finally {
            setIsAuthenticating(false)
            setIsAuthInProgress(false)
        }
    }, [msalInstance, isInitialized, isAuthenticating, isAuthInProgress])

    const handleSignIn = useCallback(async () => {
        if (!isInitialized || isAuthenticating || isAuthInProgress) return

        try {
            const response = await signIn()
            if (!response) return
            const newToken: MicrosoftToken = {
                secret: response.accessToken,
                expiresOn: response.expiresOn!.getTime(),
            }

            setToken(newToken)
            localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newToken))
            sessionStorage.setItem('isAuthenticated', 'true')
        } catch (error) {
            setToken(undefined)
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            sessionStorage.removeItem('isAuthenticated')
        }
    }, [signIn, isInitialized, isAuthenticating, isAuthInProgress])

    const handleSignOut = useCallback(async () => {
        if (!msalInstance || !isInitialized || isAuthInProgress) return

        try {
            setIsAuthInProgress(true)
            const accounts = msalInstance.getAllAccounts()

            // Wait for the logout to complete
            if (accounts.length > 0)
                await msalInstance.logoutPopup({
                    account: accounts[0],
                    postLogoutRedirectUri: window.location.origin,
                    onRedirectNavigate: () => false,
                })

            // Clear all local state
            setToken(undefined)
            setUser(undefined)
            setOneDriveFiles(undefined)
            localStorage.removeItem(TOKEN_STORAGE_KEY)

            // Clear MSAL cache
            msalInstance.clearCache()

            // Set logout flag in session storage
            sessionStorage.setItem('recentLogout', 'true')

            // Clear remaining session storage
            sessionStorage.removeItem('isAuthenticated')
        } catch (error) {
        } finally {
            setIsAuthInProgress(false)
            // Clear the logout flag after a short delay
            setTimeout(() => sessionStorage.removeItem('recentLogout'), 1000) // Adjust timeout as needed
            setActiveAdapter(Adapter.INTERNAL)
        }
    }, [
        msalInstance,
        isInitialized,
        isAuthInProgress,
        setUser,
        setOneDriveFiles,
    ])

    // Modify the auto-login effect
    useEffect(() => {
        if (!isInitialized || isAuthenticating || isAuthInProgress || token)
            return

        let autoLoginTimeout: NodeJS.Timeout

        const autoLogin = async () => {
            // Check for recent logout or existing authentication
            const hasRecentlyLoggedOut = sessionStorage.getItem('recentLogout')
            const isAuthenticated = sessionStorage.getItem('isAuthenticated')

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
    }, [isInitialized, isAuthenticating, isAuthInProgress, token, handleSignIn])

    return {
        token,
        signOut: handleSignOut,
        isInitialized,
        isAuthenticating,
        isReady: isInitialized && !isAuthenticating && token,
    }
}
