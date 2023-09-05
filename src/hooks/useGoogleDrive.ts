import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'

declare global {
    interface Window {
        google?: any
        tokenClient?: any
    }
}

const google_client_id = process.env.GOOGLE_CLIENT_ID
const google_api_key = process.env.GOOGLE_API_KEY

const useGoogleDrive = () => {
    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)
    const [access_token, setAccessToken] = useState<any>(null)

    const { gisLoaded } = useLoadGAPI()

    const getFiles = async () => {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?fields=files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)&key=${google_api_key}`,
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

    const organizeFiles = () => {
        if (!files) return
        const organizedFiles: any = files.filter(
            (f: { parents: any }) =>
                files.findIndex((ff: { id: any }) => ff.id === f.parents[0]) ===
                -1,
        )

        for (let i = 0; i < organizedFiles.length; i++) {
            const file = organizedFiles[i]
            const children = files.filter((f: { parents: string[] }) =>
                f.parents.includes(file.id),
            )
            if (children.length) file.children = children
        }
        setFiles(organizedFiles)
    }

    useEffect(() => {
        const onGisLoaded = async () => {
            const google = await window.google

            google.accounts.oauth2
                .initTokenClient({
                    client_id: google_client_id,
                    scope: 'https://www.googleapis.com/auth/drive',
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

    useEffect(() => {
        organizeFiles()
    }, [files?.length, files?.map((f: { parent: any }) => f.parent).join(',')])

    useEffect(() => {
        console.log('files', files)
    }, [files])

    return { user, files, handleSignout }
}

export default useGoogleDrive
