import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'
import type { GoogleConfigs } from 'types/GoogleConfigs'

const useGoogleDrive = (googleConfigs: GoogleConfigs) => {
    const { google_client_id, google_api_key } = googleConfigs

    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)
    const [rawFiles, setRawFiles] = useState<any>(null)
    const [access_token, setAccessToken] = useState<any>(null)

    const { gisLoaded } = useLoadGAPI()

    const getFilesList = async () => {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?fields=files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)&key=${google_api_key}`,
            {
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                },
            },
        )
        const data = await response.json()
        setRawFiles(data?.files)
    }

    const downloadFile = async (fileId: string) => {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?key=${google_api_key}`,
            {
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                    Accept: 'application/json',
                },
            },
        )
        const data = await response.blob()
        return data
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
        localStorage.removeItem('token')
        setUser(null)
    }

    const organizeFiles = () => {
        if (!rawFiles) return
        const organizedFiles: any = rawFiles.filter(
            (f: { parents: any }) =>
                rawFiles.findIndex(
                    (ff: { id: any }) => ff.id === f.parents[0],
                ) === -1,
        )

        for (let i = 0; i < organizedFiles.length; i++) {
            const file = organizedFiles[i]
            const children = rawFiles.filter((f: { parents: string[] }) =>
                f.parents.includes(file.id),
            )
            if (children.length) file.children = children
        }

        // recurse through children
        const recurse = (file: any) => {
            if (!file.children) return
            for (let i = 0; i < file.children.length; i++) {
                const child = file.children[i]
                const children = rawFiles.filter((f: { parents: string[] }) =>
                    f.parents.includes(child.id),
                )
                if (children.length) child.children = children
                recurse(child)
            }
        }

        for (let i = 0; i < organizedFiles.length; i++) {
            const file = organizedFiles[i]
            recurse(file)
        }

        setFiles({
            id: 'root-drive',
            name: 'Drive',
            children: organizedFiles,
        })
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
            getFilesList()
        }
    }, [access_token])

    useEffect(() => {
        organizeFiles()
    }, [rawFiles])

    return { user, files, handleSignout, downloadFile }
}

export default useGoogleDrive
