import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'

declare global {
    interface Window {
        google?: any
    }
}

const google_client_id = process.env.GOOGLE_CLIENT_PICKER_ID
const google_app_id = process.env.GOOGLE_APP_ID
const google_api_key = process.env.GOOGLE_API_KEY

const useGoogleDrive = () => {
    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)

    const { gdriveApiLoaded, gisLoaded } = useLoadGAPI()

    const logFiles = async () => {
        const access_token = await gapi.auth.getToken()

        // // authenticate the user
        // gapi.client.drive({
        //     version: 'v3',
        //     auth: access_token,
        // })

        console.log(gapi.client.drive)

        // @ts-ignore
        const response = await gapi.client.drive.files.list({
            fields: 'files(id, name, mimeType, size, thumbnailLink, parents, fileExtension)',
        })
        const files = response.result.files
        if (files && files.length > 0) {
            console.log('Files:')
            files.forEach((file: any) => {
                console.log(file)
            })
        } else {
            console.log('No files found.')
        }
    }

    const handleCredentialResponse = async (response: any) => {
        if (response.credential) {
            const credential = response.credential
            gapi.auth.setToken(credential)

            logFiles()
        }
    }

    const handleSignin = async () => {
        const google = await window.google
        await google.accounts.id.prompt()
    }

    const handleSignout = async () => {
        const google = await window.google
        google.accounts.id.disableAutoSelect()
        google.accounts.id.revoke()
        setUser(null)
    }

    useEffect(() => {
        const onGisLoaded = async () => {
            const google = await window.google

            await google.accounts.id.initialize({
                api_key: google_api_key,
                client_id: google_client_id,
                callback: handleCredentialResponse,
                scope: 'profile email https://www.googleapis.com/auth/drive.readonly',
            })

            google.accounts.id.prompt()
        }

        if (gisLoaded) onGisLoaded()
    }, [gisLoaded])

    useEffect(() => {
        console.log('user', user)
        console.log('files', files)
    }, [user, files])

    return { user, files, handleSignin, handleSignout }
}

export default useGoogleDrive
