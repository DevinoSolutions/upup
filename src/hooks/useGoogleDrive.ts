import { useCallback, useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'
import type { GoogleConfigs } from 'types/GoogleConfigs'
import { File, Root, Token, User } from 'google'

const useGoogleDrive = (googleConfigs: GoogleConfigs) => {
    const { google_client_id, google_api_key } = googleConfigs

    const [user, setUser] = useState<User>()
    const [googleFiles, setGoogleFiles] = useState<Root>()
    const [rawFiles, setRawFiles] = useState<File[]>()
    const [token, setToken] = useState<Token>()

    const fetchDrive = useCallback(
        async (url: string) => {
            return await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token?.access_token}`,
                },
            })
        },
        [token],
    )

    const { gisLoaded } = useLoadGAPI()

    /**
     * @description Get the list of files from Google Drive
     * @returns {Promise<void>}
     *
     */
    const getFilesList = useCallback(async () => {
        const response = await fetchDrive(
            `https://www.googleapis.com/drive/v3/files?fields=files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)&key=${google_api_key}`,
        )
        const data = await response.json()
        if (data.error) {
            console.error(data.error)
            return
        }
        setRawFiles(data.files)
    }, [fetchDrive, google_api_key])

    /**
     * @description Download a file from Google Drive
     * @param {string} fileId
     * @returns {Promise<Blob>}
     */
    const downloadFile = async (fileId: string) => {
        const response = await fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${fileId}?key=${google_api_key}`,
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
    const organizeFiles = useCallback(() => {
        if (!rawFiles) return

        // Create a set for easy lookup of file IDs
        const fileIds = new Set(rawFiles.map(f => f.id))

        // Filter files to find ones that have no parents within rawFiles
        const organizedFiles: File[] = rawFiles.filter(
            f => !(f.parents && fileIds.has(f.parents[0])),
        )

        // Create a mapping of parent IDs to their direct children
        const parentIdToChildrenMap: { [key: string]: File[] } = {}

        rawFiles.forEach(file => {
            if (file.parents) {
                file.parents.forEach(parentId => {
                    if (!parentIdToChildrenMap[parentId]) {
                        parentIdToChildrenMap[parentId] = []
                    }
                    parentIdToChildrenMap[parentId].push(file)
                })
            }
        })

        /**
         * @description Recursively add children to the tree structure
         * @param {File} file
         * @returns {void}
         */
        const recurse = (file: File) => {
            const children = parentIdToChildrenMap[file.id]
            if (children && children.length) {
                file.children = children
                children.forEach(recurse) // recursive call for each child
            }
        }

        // Assign children for each top-level file in organizedFiles and build the tree recursively
        organizedFiles.forEach(recurse)

        setGoogleFiles({
            id: 'root-drive',
            name: 'Drive',
            children: organizedFiles,
        })
    }, [rawFiles])

    useEffect(() => {
        /**
         * @description Initialize the Google Drive API
         * @returns {Promise<void>}
         */
        const storedTokenStr = localStorage.getItem('token')
        const storedToken = storedTokenStr ? JSON.parse(storedTokenStr) : null

        if (storedToken && storedToken.expires_in > Date.now())
            return setToken(storedToken)

        if (gisLoaded) {
            ;(async () => {
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
                                            (tokenResponse.expires_in - 20) *
                                                1000,
                                    }),
                                )
                                return setToken(tokenResponse)
                            } else {
                                console.error('Error: ', tokenResponse.error)
                            }
                        },
                    })
                    .requestAccessToken({})
            })()
        }
    }, [gisLoaded])

    /**
     *  @description Get the user's name and files list when the token is set
     */
    useEffect(() => {
        if (token) {
            ;(async () => {
                await getUserName()
                await getFilesList()
            })()
        }
    }, [token, getUserName, getFilesList])

    /**
     * @description Organize the files into a tree structure when the raw files are set
     */
    useEffect(() => {
        organizeFiles()
    }, [organizeFiles])

    return { user, googleFiles, handleSignout, downloadFile }
}

export default useGoogleDrive
