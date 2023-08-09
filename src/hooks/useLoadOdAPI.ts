import load from 'load-script'
import { useEffect, useState } from 'react'

const useLoadOdAPI = () => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false)

    useEffect(() => {
        /**
         * Load the OneDriveUploader API
         */
        load('https://js.live.net/v7.2/OneDrive.js', (err, _script) => {
            if (err) {
                console.log('Error loading OneDriveUploader', err)
            } else {
                setIsLoaded(true)
            }
        })
    }, [])

    return { isLoaded }
}

export default useLoadOdAPI
