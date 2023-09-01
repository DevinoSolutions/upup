import load from 'load-script'
import { useEffect, useState } from 'react'

const SCOPES = 'https://www.googleapis.com/auth/drive'

interface props {
    google_client_id: string
}

/**
 * This hook loads the Google API and the Google Identity Services API
 * @param GOOGLE_CLIENT_ID
 */
const useLoadGAPI = ({ google_client_id }: props) => {
    // const [pickerApiLoaded, setPickerApiLoaded] = useState<boolean>(false)
    const [gisLoaded, setGisLoaded] = useState<boolean>(false)
    const [tokenClient, setTokenClient] = useState<any>(null)

    /**
     * This function is called when the Google Identity Services API is loaded
     */
    const onGisLoaded = () => {
        setTokenClient(
            new (window as any).google.accounts.oauth2.initTokenClient({
                client_id: google_client_id,
                scope: SCOPES,
                callback: '', // defined later

                // Optional arguments passed to gapi.auth2.init()
                cookie_policy: 'single_host_origin',
                fetch_basic_profile: true,

                // Optional arguments passed to gapi.auth2.getAuthInstance().grantOfflineAccess()
                access_type: 'offline',
                prompt: 'consent',
                include_granted_scopes: true,
            }),
        )
        setGisLoaded(true)
    }

    useEffect(() => {
        /**
         * Load the Google Drive API
         */
        load('https://apis.google.com/js/api.js', (err, _script) => {
            if (err) {
                console.log('Error loading GAPI', err)
            } else {
                gapi.load('client', () => {
                    gapi.client.load('drive', 'v3', () => {
                        console.log('Loaded Google Drive API')
                    })
                })
            }
        })

        /**
         *  Load the Google Identity Services API
         */
        load('https://accounts.google.com/gsi/client', async (err, _script) => {
            if (err) {
                console.log('Error loading GAPI', err)
            } else {
                onGisLoaded()
            }
        })
    }, [gisLoaded])

    /**
     * Return the tokenClient, pickerApiLoaded, and gisLoaded
     */
    return { tokenClient, gisLoaded }
}

export default useLoadGAPI
