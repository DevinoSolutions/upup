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

    // const handleCredentialResponse = async (response: any) => {
    //     if (response.credential) {
    //         const credential = response.credential
    //         const decoded = jwt_decode(credential)

    //         setUser(decoded)
    //         logFiles()
    //     }
    // }

    // const handleSignin = async () => {
    //     const google = await window.google
    //     await google.accounts.id.prompt()
    // }

    const handleSignout = async () => {
        const google = await window.google
        google.accounts.id.revoke()
        setUser(null)
    }

    useEffect(() => {
        const onGisLoaded = async () => {
            const google = await window.google

            google.accounts.oauth2
                .initTokenClient({
                    client_id: google_client_id,
                    scope: 'https://www.googleapis.com/auth/drive.readonly',
                    ux_mode: 'popup',
                    callback(tokenResponse: { error: any; access_token: any }) {
                        if (tokenResponse && !tokenResponse.error) {
                            localStorage.setItem(
                                'token',
                                JSON.stringify({
                                    ...tokenResponse,
                                    expires_in:
                                        Date.now() +
                                        // @ts-ignore
                                        (tokenResponse.expires_in - 20) * 1000,
                                }),
                            )
                            return setAccessToken(tokenResponse)
                        }

                        console.log('tokenResponse', tokenResponse)
                    },
                })
                .requestAccessToken({})
        }
        const storedTokenStr = localStorage.getItem('token')
        const storedToken = storedTokenStr ? JSON.parse(storedTokenStr) : null

        if (storedToken && storedToken.expires_in > Date.now())
            return setAccessToken(storedToken)

        if (gisLoaded) onGisLoaded()
    }, [gisLoaded])

    useEffect(() => {
        console.log('user', user)
        console.log('files', files)
        console.log('access_token', access_token)
    }, [user, files, access_token])

    return { user, files, handleSignout }
}

export default useGoogleDrive
