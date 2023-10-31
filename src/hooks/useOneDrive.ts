import { useCallback, useEffect, useState } from 'react'
import { MicrosoftUser, OneDriveFile, OneDriveRoot } from 'microsoft'
import usePCAInstance from './usePCAInstance'
import { GoogleFile } from 'google'
import useOneDriveAuth from './useOneDriveAuth'

/**
 * Maps OneDrive file to GoogleFile format.
 * @param file The OneDrive file to map.
 * @returns The mapped Google file.
 */
const mapToOneDriveFile = (file: OneDriveFile): GoogleFile => {
    const isFolder = file.folder !== undefined
    return {
        id: file.id,
        name: file.name,
        mimeType: isFolder
            ? 'application/vnd.google-apps.folder'
            : file.file!.mimeType,
        children: file.children ? file.children.map(mapToOneDriveFile) : [],
    }
}

/**
 * @description Map to OneDrive root
 * @param oneDriveRoot
 */
const mapToOneDriveRoot = (oneDriveRoot: OneDriveRoot) => {
    return {
        id: oneDriveRoot.id,
        name: oneDriveRoot.name,
        children: oneDriveRoot.children
            ? oneDriveRoot.children.map(mapToOneDriveFile)
            : [],
    }
}
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

    const { msalInstance } = usePCAInstance(clientId)
    const { token, signOut } = useOneDriveAuth({
        msalInstance,
        setUser,
        setOneDriveFiles,
    })

    const fetchWithAuth = useCallback(
        async (endpoint: string) => {
            if (!token) throw new Error('Authentication token is missing.')
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token.secret}`,
                },
            })
            if (!response.ok) throw new Error(response.statusText)
            return endpoint.endsWith('/content')
                ? response.blob()
                : response.json()
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
    }, [fetchWithAuth])

    const downloadFile = useCallback(
        async (fileId: string) => {
            const response = await fetchWithAuth(
                `${GRAPH_API_ENDPOINT}/drive/items/${fileId}/content`,
            )

            if (!response) {
                throw new Error('Failed to download file')
            }

            return response
        },
        [token], // add organizeFiles to the dependency array
    )

    useEffect(() => {
        if (token) {
            fetchWithAuth(GRAPH_API_ENDPOINT)
                .then(profile =>
                    setUser({ name: profile.displayName, mail: profile.mail }),
                )
                .catch(error => console.error('Profile fetch error:', error))

            fetchFileList().catch(error =>
                console.error('File list fetch error:', error),
            )
        }
    }, [token, fetchWithAuth, fetchFileList])

    useEffect(() => {
        if (rawFiles.length > 0) {
            organizeFiles(rawFiles).catch(error =>
                console.error('File organization error:', error),
            )
        }
    }, [rawFiles, organizeFiles])

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
