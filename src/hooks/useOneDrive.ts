import { useCallback, useEffect, useState } from 'react'
import { MicrosoftUser, OneDriveFile } from 'microsoft'
import usePCAInstance from './usePCAInstance'
import UseOneDriveAuth from './useOneDriveAuth'

const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0/me'
const GRAPH_API_FILES_ENDPOINT =
    'https://graph.microsoft.com/v1.0/me/drive/root/children'

interface AuthProps {
    user: MicrosoftUser | undefined
    fileList: OneDriveFile[] | undefined
    signOut: () => void
    downloadFile: (fileId: string) => Promise<Blob>
}

function useOneDrive(clientId: string): AuthProps {
    const [user, setUser] = useState<MicrosoftUser | undefined>()
    const [rawFiles, setRawFiles] = useState<OneDriveFile[]>()

    const [fileList, setFileList] = useState<OneDriveFile[]>([])
    const { msalInstance } = usePCAInstance(clientId)
    const { token, signOut } = UseOneDriveAuth({
        msalInstance,
        setUser,
        setFileList,
    })

    console.log(rawFiles)

    /**
     * @description Fetch the list of files from the OneDrive API
     * @param {string} accessToken
     * @returns {Promise<void>}
     */
    const fetchFileList = useCallback(
        async (accessToken: string) => {
            const response = await fetch(GRAPH_API_FILES_ENDPOINT, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch file list')
            }

            const data = await response.json()
            setRawFiles(data.value)
        },
        [clientId],
    )

    const organizeFiles = useCallback(() => {
        if (!rawFiles) return

        // Create a set for easy lookup of file IDs
        const fileIds = new Set(rawFiles.map(f => f.id))

        // Filter files to find ones that have no parents within rawFiles
        const organizedFiles: OneDriveFile[] = rawFiles.filter(
            f => !(f.parentReference && fileIds.has(f.parentReference.id)),
        )

        // Create a mapping of parent IDs to their direct children
        const children: { [key: string]: OneDriveFile[] } = {}

        rawFiles.forEach(f => {
            if (f.parentReference && children[f.parentReference.id]) {
                children[f.parentReference.id].push(f)
            } else if (f.parentReference) {
                children[f.parentReference.id] = [f]
            }
        })

        /**
         * @description Recursively add children to the tree structure
         * @param {OneDriveFile} file
         * @returns {void}
         */
    }, [rawFiles])

    const downloadFile = async (fileId: string) => {
        const endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`
        const response = await fetch(endpoint, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to download file')
        }

        return await response.blob()
    }

    const fetchProfileInfo = useCallback(async (accessToken: string) => {
        const response = await fetch(GRAPH_API_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch profile info')
        }

        return response.json()
    }, [])

    useEffect(() => {
        if (token) {
            ;(async () => {
                const profile = await fetchProfileInfo(token.secret)
                setUser({
                    name: profile.displayName,
                    mail: profile.mail,
                })
                await fetchFileList(token.secret)
            })()
        }
    }, [token, fetchProfileInfo, fetchFileList])

    return { user, fileList: rawFiles, signOut, downloadFile }
}

export default useOneDrive
