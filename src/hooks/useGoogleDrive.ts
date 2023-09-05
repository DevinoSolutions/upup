import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'

declare global {
    interface Window {
        google?: any
        tokenClient?: any
    }
}

const google_client_id = process.env.GOOGLE_CLIENT_PICKER_ID

const useGoogleDrive = () => {
    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)
    const [access_token, setAccessToken] = useState<any>(null)

    const { gisLoaded } = useLoadGAPI()

    const getFiles = async () => {
        const response = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                },
            },
        )
        const data = await response.json()
        setFiles(data?.files)
    }

    const getUserName = async () => {
        const response = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                },
            },
        )
        const data = await response.json()
        setUser(data)
    }

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
        if (access_token) {
            getUserName()
            getFiles()
        }
    }, [access_token])

    return { user, files, handleSignout }
}

export default useGoogleDrive
