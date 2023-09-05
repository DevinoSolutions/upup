import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'
import jwt_decode from 'jwt-decode'

declare global {
    interface Window {
        google?: any
        tokenClient?: any
    }
}

const google_client_id = process.env.GOOGLE_CLIENT_PICKER_ID
const google_app_id = process.env.GOOGLE_APP_ID
const google_api_key = process.env.GOOGLE_API_KEY

const SCOPES = `https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly`

const useGoogleDrive = () => {
    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)
    const [access_token, setAccessToken] = useState<any>(null)

    const { gdriveApiLoaded, gisLoaded } = useLoadGAPI({
        google_client_id,
        google_app_id,
        google_api_key,
    })

    const logFiles = async () => {
        // console.log('access_token', access_token)
        // // @ts-ignore
        // const response = await gapi.client.drive.files.list({
        //     fields: 'files(id, name, mimeType, size, thumbnailLink, parents, fileExtension)',
        //     headers: {
        //         Authorization: `Bearer ${credential}`,
        //     },
        // })
        // const files = response.result.files
        // if (files && files.length > 0) {
        //     console.log('Files:')
        //     files.forEach((file: any) => {
        //         console.log(file)
        //     })
        // } else {
        //     console.log('No files found.')
        // }
    }

    const handleCredentialResponse = async (response: any) => {
        if (response.credential) {
            const credential = response.credential
            const decoded = jwt_decode(credential)

            setUser(decoded)
            logFiles()
        }
    }

    const handleSignin = async () => {
        // const google = await window.google
        // await google.accounts.id.prompt()
        const tokenClient = await window.tokenClient
        tokenClient.requestAccessToken({
            prompt: 'none',
            ux_mode: 'redirect',
        })
    }

    const handleSignout = async () => {
        const google = await window.google
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
                scope: SCOPES,
            })

            const tokenClient = await google.accounts.oauth2.initTokenClient({
                client_id: google_client_id,
                scope: SCOPES,
                callbsck: (tokenResponse: any) => {
                    console.log('tokenResponse', tokenResponse)
                    setAccessToken(tokenResponse.access_token)
                },
                ux_mode: 'redirect',
            })

            // await google.accounts.id.prompt()

            window.tokenClient = tokenClient
        }

        if (gisLoaded) onGisLoaded()
    }, [gisLoaded])

    useEffect(() => {
        console.log('user', user)
        console.log('files', files)
        console.log('access_token', access_token)
    }, [user, files, access_token])

    return { user, files, handleSignin, handleSignout }
}

export default useGoogleDrive
