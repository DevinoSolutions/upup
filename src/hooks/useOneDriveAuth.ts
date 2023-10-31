import {
    AuthenticationResult,
    PopupRequest,
    PublicClientApplication,
} from '@azure/msal-browser'
import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useState,
} from 'react'
import { MicrosoftToken, MicrosoftUser, OneDriveRoot } from 'microsoft'

const TOKEN_STORAGE_KEY =
    '00000000-0000-0000-0078-f20226514725.9188040d-6c67-4c5b-b112-36a304b66dad-login.windows.net-accesstoken-6a5dfe6b-7b41-4f43-a4f3-5c6e434056e1-9188040d-6c67-4c5b-b112-36a304b66dad-user.read files.readwrite.all files.read.all openid profile--'

type Props = {
    msalInstance: PublicClientApplication
    setUser: Dispatch<SetStateAction<MicrosoftUser | undefined>>
    setOneDriveFiles: Dispatch<SetStateAction<OneDriveRoot | undefined>>
}

const getStoredToken = (): MicrosoftToken | null => {
    const storedTokenObject = sessionStorage.getItem(TOKEN_STORAGE_KEY)
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
            await signIn()
            const storedToken = getStoredToken()
            storedToken && setToken(storedToken)
        }
    }, [msalInstance, signIn])

    const handleSignOut = useCallback(() => {
        setToken(null)
        setUser(undefined)
        setOneDriveFiles(undefined)
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
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
