import { useCallback, useEffect, useState } from 'react'
import { MicrosoftUser, OneDriveFile, OneDriveRoot } from 'microsoft'
import usePCAInstance from './usePCAInstance'
import UseOneDriveAuth from './useOneDriveAuth'

const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0/me'
const GRAPH_API_FILES_ENDPOINT =
    'https://graph.microsoft.com/v1.0/me/drive/root/children'

interface AuthProps {
    user: MicrosoftUser | undefined
    oneDriveFiles: OneDriveRoot | undefined
    signOut: () => void
    downloadFile: (fileId: string) => Promise<Blob>
}

function useOneDrive(clientId: string): AuthProps {
    const [user, setUser] = useState<MicrosoftUser | undefined>()
    const [rawFiles, setRawFiles] = useState<OneDriveFile[]>()

    const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveRoot>()
    const { msalInstance } = usePCAInstance(clientId)
    const { token, signOut } = UseOneDriveAuth({
        msalInstance,
        setUser,
        setOneDriveFiles,
    })

    console.log(rawFiles)

    const organizeFiles = useCallback((rawFiles: OneDriveFile[]) => {
        // Create a set for easy lookup of file IDs
        const fileIds = new Set(rawFiles.map(f => f.id))

        // Filter files to find ones that have no parents within rawFiles
        const organizedFiles: OneDriveFile[] = rawFiles.filter(
            f => !(f.parentReference && fileIds.has(f.parentReference.id)),
        )

        // Create a mapping of parent IDs to their direct children
        const children: { [key: string]: OneDriveFile[] } = {}

        rawFiles.forEach(f => {
            if (f.parentReference) {
                const parentId = f.parentReference.id
                if (children[parentId]) children[parentId].push(f)
                else children[parentId] = [f]
            }
        })

        const recurse = (file: OneDriveFile) => {
            const child = children[file.id]
            if (child && child.length) {
                file.children = child
                child.forEach(recurse) // recursive call for each child
            }
        }

        // Assign children for each top-level file in organizedFiles and build the tree recursively
        organizedFiles.forEach(recurse)

        setOneDriveFiles({
            id: 'root',
            name: 'OneDrive',
            children: organizedFiles,
        })
    }, [])

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
            organizeFiles(data.value) // invoke organizeFiles here
        },
        [clientId, organizeFiles], // add organizeFiles to the dependency array
    )

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

    /**
     * @description Organize the files into a tree structure when the raw files are set
     */
    useEffect(() => {
        organizeFiles(rawFiles || [])
    }, [organizeFiles, rawFiles])

    return { user, oneDriveFiles, signOut, downloadFile }
}

export default useOneDrive
