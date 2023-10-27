import { PublicClientApplication } from '@azure/msal-browser'

let msalInstance: PublicClientApplication | null = null

const usePCAInstance = (clientId: string) => {
    if (msalInstance) return { msalInstance }

    msalInstance = new PublicClientApplication({
        auth: {
            clientId,
            redirectUri: window.location.origin,
        },
        cache: {
            cacheLocation: 'sessionStorage',
            storeAuthStateInCookie: false,
        },
        system: {
            allowNativeBroker: true,
        },
    })

    return { msalInstance }
}

export default usePCAInstance
