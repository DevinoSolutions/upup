import useOneDriveAuth from 'frontend/hooks/useOneDriveAuth'
import usePCAInstance from 'frontend/hooks/usePCAInstance'
import { MicrosoftUser, OneDriveFile, OneDriveRoot } from 'microsoft'
import { useCallback, useEffect, useState } from 'react'

const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0/me'
const GRAPH_API_FILES_ENDPOINT = `${GRAPH_API_ENDPOINT}/drive/root/children`

interface AuthProps {
    user: MicrosoftUser | undefined
    oneDriveFiles: OneDriveRoot | undefined
    signOut: () => void
    downloadFile: (fileId: string) => Promise<Blob>
}

function useOneDrive(clientId: string): AuthProps {
    const [user, setUser] = useState<MicrosoftUser | undefined>()
    const [rawFiles, setRawFiles] = useState<OneDriveFile[]>([])
    const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveRoot>()
    const [oneDriveRoot, setOneDriveRoot] = useState<OneDriveRoot>()

    const { msalInstance } = usePCAInstance(clientId)
    const { token, signOut } = useOneDriveAuth({
        msalInstance,
        setUser,
        setOneDriveFiles,
    })

    /**
     * Maps OneDrive file to GoogleFile format.
     * @param file The OneDrive file to map.
     * @returns The mapped Google file.
     */
    const mapToOneDriveFile = async (
        file: OneDriveFile,
    ): Promise<OneDriveFile> => {
        const isFolder = file.folder !== undefined
        let thumbnails = undefined
        if (!isFolder) {
            try {
                const thumbnailResponse = await fetchWithAuth(
                    `${GRAPH_API_ENDPOINT}/drive/items/${file.id}/thumbnails`,
                )
                thumbnails = thumbnailResponse.value[0] // Assuming there's always at least one thumbnail.
            } catch (error) {
                console.error('Error fetching thumbnails:', error)
            }
        }
        return {
            id: file.id,
            name: file.name,
            file: {
                mimeType: isFolder
                    ? 'application/vnd.google-apps.folder'
                    : file.file!.mimeType,
            },
            children: file.children
                ? await Promise.all(file.children.map(mapToOneDriveFile))
                : [],
            '@microsoft.graph.downloadUrl':
                file['@microsoft.graph.downloadUrl']!,
            thumbnails: thumbnails,
        }
    }

    /**
     * @description Map to OneDrive root
     * @param oneDriveRoot
     */
    const mapToOneDriveRoot = async (oneDriveRoot: OneDriveRoot) => {
        const children = oneDriveRoot.children
            ? await Promise.all(oneDriveRoot.children.map(mapToOneDriveFile))
            : []
        return {
            id: oneDriveRoot.id,
            name: oneDriveRoot.name,
            children: children,
        }
    }

    const fetchWithAuth = useCallback(
        async (endpoint: string) => {
            if (!token) throw new Error('Authentication token is missing.')
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token.secret}`,
                },
            })
            if (!response.ok) throw new Error(response.statusText)
            return response.json()
        },
        [token],
    )

    const recurse = useCallback(
        async (file: OneDriveFile) => {
            if (file.folder && file.folder.childCount > 0) {
                const childrenData = await fetchWithAuth(
                    `${GRAPH_API_ENDPOINT}/drive/items/${file.id}/children`,
                )
                file.children = childrenData.value
                await Promise.all(file.children!.map(child => recurse(child)))
            }
        },
        [fetchWithAuth],
    )

    const organizeFiles = useCallback(
        async (files: OneDriveFile[]) => {
            const fileIds = new Set(files.map(f => f.id))
            const organizedFiles = files.filter(
                f => !f.parentReference || !fileIds.has(f.parentReference.id),
            )
            await Promise.all(organizedFiles.map(recurse))
            setOneDriveFiles({
                id: 'root',
                name: 'OneDrive',
                children: organizedFiles,
            })
        },
        [recurse],
    )

    const fetchFileList = useCallback(async () => {
        const data = await fetchWithAuth(GRAPH_API_FILES_ENDPOINT)
        setRawFiles(data.value)
        await organizeFiles(data.value)
    }, [token])

    const downloadFile = useCallback(async (url: string) => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(response.statusText)
        return response.blob()
    }, [])

    useEffect(() => {
        if (token) {
            const initialize = async () => {
                try {
                    const profile = await fetchWithAuth(GRAPH_API_ENDPOINT)
                    setUser({ name: profile.displayName, mail: profile.mail })
                    await fetchFileList()
                } catch (error) {
                    console.error('Error fetching profile or file list:', error)
                }
            }
            void initialize()
        }
    }, [token, fetchFileList])

    useEffect(() => {
        if (rawFiles.length > 0) {
            organizeFiles(rawFiles).catch(error =>
                console.error('File organization error:', error),
            )
        }
    }, [rawFiles, organizeFiles])

    useEffect(() => {
        const mapFiles = async () => {
            if (!oneDriveFiles) return
            const oneDriveData = await mapToOneDriveRoot(oneDriveFiles)
            setOneDriveRoot(oneDriveData)
        }
        mapFiles().catch(error =>
            console.error('Error mapping OneDrive files:', error),
        )
    }, [oneDriveFiles])

    return { user, oneDriveFiles: oneDriveRoot, signOut, downloadFile }
}

export default useOneDrive
