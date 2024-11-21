import { PublicClientApplication } from '@azure/msal-browser'

let msalInstance: PublicClientApplication | null = null

const usePCAInstance = (clientId: string) => {
    if (msalInstance) return { msalInstance }

    msalInstance = new PublicClientApplication({
        auth: {
            clientId,
            redirectUri: window.location.origin,
            authority: 'https://login.microsoftonline.com/common',
        },
        cache: {
            cacheLocation: 'sessionStorage',
            storeAuthStateInCookie: false,
        },
    })

    return { msalInstance }
}

export default usePCAInstance
