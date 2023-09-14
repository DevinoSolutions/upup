import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'
import type { GoogleConfigs } from 'types/GoogleConfigs'
import { File, Root, Token, User } from 'google'

const fetchDrive = async (url: string, accessToken: string) => {
    return await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
}

const useGoogleDrive = (googleConfigs: GoogleConfigs) => {
    const { google_client_id, google_api_key } = googleConfigs

    const [user, setUser] = useState<User>()
    const [googleFiles, setGoogleFiles] = useState<Root>()
    const [rawFiles, setRawFiles] = useState<File[]>()
    const [token, setToken] = useState<Token>()

    console.log('access_token', token)

    const { gisLoaded } = useLoadGAPI()

    /**
     * @description Get the list of files from Google Drive
     * @returns {Promise<void>}
     *
     */
    const getFilesList = async () => {
        const response = await fetchDrive(
            `https://www.googleapis.com/drive/v3/files?fields=files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)&key=${google_api_key}`,
            token?.access_token!,
        )
        const data = await response.json()
        if (data.error) {
            console.error(data.error)
            return
        }

        setRawFiles(data.files)
    }

    /**
     * @description Download a file from Google Drive
     * @param {string} fileId
     * @returns {Promise<Blob>}
     */
    const downloadFile = async (fileId: string) => {
        const response = await fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${fileId}?key=${google_api_key}`,
            token?.access_token!,
        )
        return await response.blob()
    }

    /**
     * @description Get the user's name from Google Drive
     * @returns {Promise<void>}
     */
    const getUserName = async () => {
        const response = await fetchDrive(
            `https://www.googleapis.com/oauth2/v3/userinfo`,
            token?.access_token!,
        )
        const data = await response.json()
        setUser(data)
    }

    /**
     * @description Sign out of Google Drive and remove access token from local storage
     * @returns {Promise<void>}
     */
    const handleSignout = async () => {
        const google = await window.google
        google.accounts.id.revoke()
        localStorage.removeItem('token')
        setUser(undefined)
    }

    /**
     * @description Organize the files into a tree structure
     * @returns {void}
     */
    const organizeFiles = () => {
        if (!rawFiles) return
        const organizedFiles: File[] = rawFiles.filter(
            f =>
                rawFiles.findIndex(
                    ff => f.parents && ff.id === f.parents[0],
                ) === -1,
        )

        for (let i = 0; i < organizedFiles.length; i++) {
            const file = organizedFiles[i]
            const children = rawFiles.filter(
                f => f.parents && f.parents.includes(file.id),
            )
            if (children.length) file.children = children
        }

        /**
         * @description Recursively add children to the tree structure
         * @param {File} file
         * @returns {void}
         */
        const recurse = (file: File) => {
            if (!file.children) return
            for (let i = 0; i < file.children.length; i++) {
                const child = file.children[i]
                const children = rawFiles.filter(
                    f => f.parents?.includes(child.id),
                )
                if (children.length) child.children = children
                recurse(child)
            }
        }

        for (let i = 0; i < organizedFiles.length; i++) {
            const file = organizedFiles[i]
            recurse(file)
        }

        setGoogleFiles({
            id: 'root-drive',
            name: 'Drive',
            children: organizedFiles,
        })
    }

    useEffect(() => {
        /**
         * @description Initialize the Google Drive API
         * @returns {Promise<void>}
         */
        const onGisLoaded = async () => {
            const google = await window.google

            google.accounts.oauth2
                .initTokenClient({
                    client_id: google_client_id,
                    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
                    ux_mode: 'popup',
                    callback(tokenResponse: Token) {
                        if (tokenResponse && !tokenResponse.error) {
                            localStorage.setItem(
                                'token',
                                JSON.stringify({
                                    ...tokenResponse,
                                    expires_in:
                                        Date.now() +
                                        (tokenResponse.expires_in - 20) * 1000,
                                }),
                            )
                            return setToken(tokenResponse)
                        } else {
                            console.error('Error: ', tokenResponse.error)
                        }
                    },
                })
                .requestAccessToken({})
        }
        const storedTokenStr = localStorage.getItem('token')
        const storedToken = storedTokenStr ? JSON.parse(storedTokenStr) : null

        if (storedToken && storedToken.expires_in > Date.now())
            return setToken(storedToken)

        if (gisLoaded) onGisLoaded()
    }, [gisLoaded])

    useEffect(() => {
        if (token) {
            void getUserName()
            void getFilesList()
        }
    }, [token])

    useEffect(() => {
        organizeFiles()
    }, [rawFiles])

    return { user, googleFiles, handleSignout, downloadFile }
}

export default useGoogleDrive
