import load from 'load-script'
import { useEffect, useState } from 'react'

type useLoadGAPIProps = {
    google_client_id: string
    google_app_id: string
    google_api_key: string
}

/**
 * This hook loads the Google API and the Google Identity Services API
 *
 */
const useLoadGAPI = ({
    google_client_id,
    google_app_id,
    google_api_key,
}: useLoadGAPIProps) => {
    const [gisLoaded, setGisLoaded] = useState<boolean>(false)
    const [gdriveApiLoaded, setGdriveApiLoaded] = useState<boolean>(false)

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
                        setGdriveApiLoaded(true)
                    })
                })
            }
        })

        /**
         *  Load the Google Identity Services API
         */
        load('https://accounts.google.com/gsi/client', async (err, _script) => {
            if (err) console.log('Error loading GAPI', err)
            else setGisLoaded(true)
        })
    }, [gisLoaded])

    /**
     * Return the gdriveApiLoaded and gisLoaded
     */
    return { gdriveApiLoaded, gisLoaded }
}

export default useLoadGAPI
