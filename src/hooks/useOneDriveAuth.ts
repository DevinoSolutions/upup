import {
    AuthenticationResult,
    PopupRequest,
    PublicClientApplication,
} from '@azure/msal-browser'

function useOneDriveAuth(clientId: string) {
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

    const acquireToken = async (): Promise<string | null> => {
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
            return response.accessToken
        } catch (error) {
            console.error('Error during token acquisition:', error)
            return null
        }
    }

    const handleSignIn = async () => {
        const result = await signIn()
        if (result) {
            const token = await acquireToken()
            console.log('Token:', token)
        }
    }

    return {
        handleSignIn,
    }
}

export default useOneDriveAuth
