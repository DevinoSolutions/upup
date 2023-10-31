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

    const recurse = async (file: OneDriveFile) => {
        if (file.folder && file.folder.childCount > 0) {
            const childrenData = await fetchChildren(file.id)
            file.children = childrenData.value
            await Promise.all(file.children!.map(child => recurse(child)))
        }
    }

    const organizeFiles = useCallback(
        async (rawFiles: OneDriveFile[]) => {
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

            // Assign children for each top-level file in organizedFiles and build the tree recursively
            await Promise.all(organizedFiles.map(file => recurse(file)))

            setOneDriveFiles({
                id: 'root',
                name: 'OneDrive',
                children: organizedFiles,
            })
        },
        [token],
    )

    const downloadFile = useCallback(
        async (fileId: string) => {
            const endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token?.secret}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to download file')
            }

            return await response.blob()
        },
        [token],
    )

    const fetchProfileInfo = useCallback(async () => {
        const response = await fetch(GRAPH_API_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${token?.secret}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch profile info')
        }

        return response.json()
    }, [token])

    /**
     * @description Fetch the list of files from the OneDrive API
     * @param {string} accessToken
     * @returns {Promise<void>}
     */
    const fetchFileList = useCallback(
        async () => {
            console.log(token)
            const response = await fetch(GRAPH_API_FILES_ENDPOINT, {
                headers: {
                    Authorization: `Bearer ${token?.secret}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch file list')
            }

            const data = await response.json()
            setRawFiles(data.value)
            await organizeFiles(data.value) // invoke organizeFiles here
        },
        [clientId, organizeFiles, token], // add organizeFiles to the dependency array
    )

    const fetchChildren = useCallback(
        async (folderId: string) => {
            const endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token?.secret}`,
                },
            })

            if (!response.ok) throw new Error('Failed to fetch children')

            return response.json()
        },
        [organizeFiles, token],
    )

    const mapToOneDriveFile = (file: OneDriveFile): any => {
        const isFolder = file.folder !== undefined
        return {
            id: file.id,
            name: file.name,
            mimeType: isFolder
                ? 'application/vnd.google-apps.folder'
                : file.file?.mimeType,
            // ...other properties you need
            children: file.children ? file.children.map(mapToOneDriveFile) : [],
        }
    }

    const mapToOneDriveRoot = (oneDriveRoot: OneDriveRoot) => {
        return {
            id: oneDriveRoot.id,
            name: oneDriveRoot.name,
            children: oneDriveRoot.children
                ? oneDriveRoot.children.map(mapToOneDriveFile)
                : [],
        }
    }

    useEffect(() => {
        if (token) {
            ;(async () => {
                const profile = await fetchProfileInfo()
                setUser({
                    name: profile.displayName,
                    mail: profile.mail,
                })
                await fetchFileList()
            })()
        }
    }, [token, fetchProfileInfo, fetchFileList])

    /**
     * @description Organize the files into a tree structure when the raw files are set
     */
    useEffect(() => {
        if (rawFiles) {
            ;(async () => {
                await organizeFiles(rawFiles)
            })()
        }
    }, [organizeFiles, rawFiles, token, fetchFileList])

    return {
        user,
        oneDriveFiles: oneDriveFiles
            ? mapToOneDriveRoot(oneDriveFiles)
            : undefined,
        signOut,
        downloadFile,
    }
}

export default useOneDrive
