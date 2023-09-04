import load from 'load-script'
import { useEffect, useState } from 'react'

/**
 * This hook loads the Google API and the Google Identity Services API
 *
 */
const useLoadGAPI = () => {
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
