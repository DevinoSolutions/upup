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

const TOKEN_STORAGE_KEY = 'oneDriveToken'

type Props = {
    msalInstance: PublicClientApplication
    setUser: Dispatch<SetStateAction<MicrosoftUser | undefined>>
    setOneDriveFiles: Dispatch<SetStateAction<OneDriveRoot | undefined>>
}

const getStoredToken = (): MicrosoftToken | null => {
    let storedTokenObject = localStorage.getItem(TOKEN_STORAGE_KEY)

    if (!storedTokenObject) return null

    const storedToken = JSON.parse(storedTokenObject)
    return {
        expiresOn: storedToken.expiresOn * 1000,
        secret: storedToken.secret,
    }
}

const useOneDriveAuth = ({
    msalInstance,
    setUser,
    setOneDriveFiles,
}: Props) => {
    const [token, setToken] = useState<MicrosoftToken | null>(getStoredToken())

    const signIn =
        useCallback(async (): Promise<AuthenticationResult | null> => {
            try {
                const loginRequest: PopupRequest = {
                    scopes: [
                        'user.read',
                        'Files.ReadWrite.All',
                        'Files.Read.All',
                    ],
                    prompt: 'select_account',
                }
                return await msalInstance.loginPopup(loginRequest)
            } catch (error) {
                console.error('Error during signIn:', error)
                return null
            }
        }, [msalInstance])

    const handleSignIn = useCallback(async () => {
        if (msalInstance) {
            await msalInstance.initialize()
            await signIn().then(
                async (response: AuthenticationResult | null) => {
                    if (response) {
                        const token: MicrosoftToken = {
                            secret: response.accessToken,
                            expiresOn: response.expiresOn!.getTime(),
                        }
                        setToken(token)
                        localStorage.setItem(
                            TOKEN_STORAGE_KEY,
                            JSON.stringify(token),
                        )
                    }
                },
            )
        }
    }, [msalInstance, signIn])

    const handleSignOut = useCallback(() => {
        setToken(null)
        setUser(undefined)
        setOneDriveFiles(undefined)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
    }, [setUser, setOneDriveFiles])

    useEffect(() => {
        const storedToken = getStoredToken()
        if (storedToken && storedToken.expiresOn > Date.now())
            setToken(storedToken)
        else handleSignIn()
    }, [handleSignIn])

    return { token, signOut: handleSignOut }
}

export default useOneDriveAuth
