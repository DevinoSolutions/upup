import { DropboxFile, DropboxRoot } from 'dropbox'
import { useCallback, useEffect, useState } from 'react'
import { useRootContext } from '../context/RootContext'

/**
 * @description Helper function to format API response items
 * @param {any} entry - The entry from Dropbox API
 * @returns {DropboxFile} - Formatted file object
 */
const formatFileItem = (entry: any): DropboxFile => ({
    id: entry.id,
    name: entry.name,
    path_display: entry.path_display,
    isFolder: entry['.tag'] === 'folder',
    size: entry.size,
    thumbnailLink: null,
})

/**
 * @description Get a temporary download link for a file
 * @param {DropboxFile} file - The file to get a download link for
 * @param {string} token - The Dropbox access token
 * @returns {Promise<string>} - The download URL
 */
const getDownloadUrl = async (
    file: DropboxFile,
    token: string,
): Promise<string> => {
    const response = await fetch(
        'https://api.dropboxapi.com/2/files/get_temporary_link',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: file.path_display,
            }),
        },
    )

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data.error_summary || 'Failed to get temporary link')
    }

    return data.link
}

export default function useDropboxUploader(token?: string) {
    const {
        props: { onError },
        setActiveAdapter,
        setFiles,
    } = useRootContext()
    const [path, setPath] = useState<DropboxRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<DropboxFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState<boolean>(false)
    const [isValidToken, setIsValidToken] = useState<boolean>(false)

    // Validate token on mount and when token changes
    useEffect(() => {
        if (!token) {
            setIsValidToken(false)
            return
        }

        // Simple validation check - set valid if token exists and has some length
        setIsValidToken(typeof token === 'string' && token.length > 0)
    }, [token])

    /**
     * @description Fetch contents of a folder
     * @param {DropboxFile} file - The folder to fetch contents from
     * @returns {Promise<void>}
     */
    const fetchFolderContents = useCallback(
        async (file: DropboxFile) => {
            if (!isValidToken) {
                onError('Not authenticated with Dropbox')
                return
            }

            setIsClickLoading(true)
            try {
                const response = await fetch(
                    'https://api.dropboxapi.com/2/files/list_folder',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            path: file.path_display,
                            recursive: false,
                            include_media_info: true,
                        }),
                    },
                )

                const data = await response.json()
                if (!response.ok) {
                    throw new Error(
                        data.error_summary || 'Failed to fetch folder contents',
                    )
                }

                const files = data.entries.map(formatFileItem)
                setPath(prevPath => [
                    ...prevPath,
                    { ...file, children: files, isFolder: true },
                ])
            } catch (error) {
                onError((error as Error).message)
            } finally {
                setIsClickLoading(false)
            }
        },
        [token, onError, isValidToken],
    )

    /**
     * @description Handle clicking on a file or folder
     * @param {DropboxFile} file - The clicked file or folder
     * @returns {Promise<void>}
     */
    const handleClick = useCallback(
        async (file: DropboxFile) => {
            if (!isValidToken) {
                onError('Not authenticated with Dropbox')
                return
            }

            if (file.isFolder) {
                await fetchFolderContents(file)
            } else {
                setSelectedFiles(prevFiles => {
                    const isSelected = prevFiles.some(f => f.id === file.id)
                    return isSelected
                        ? prevFiles.filter(f => f.id !== file.id)
                        : [...prevFiles, file]
                })
            }
        },
        [fetchFolderContents, onError, isValidToken],
    )

    /**
     * @description Download multiple files
     * @param {DropboxFile[]} files - The files to download
     * @returns {Promise<File[]>} - The downloaded files
     */
    const downloadFiles = useCallback(async (files: DropboxFile[]) => {
        const promises = files.map(async (file, index) => {
            const downloadedFile = await downloadFile(file)

            setDownloadProgress(Math.round(((index + 1) / files.length) * 100))

            return downloadedFile
        })

        return await Promise.all(promises)
    }, [])

    /**
     * @description Download a single file
     * @param {DropboxFile} file - The file to download
     * @returns {Promise<File|undefined>} - The downloaded file or undefined if error
     */
    const downloadFile = useCallback(
        async (file: DropboxFile) => {
            if (!isValidToken) {
                onError('Not authenticated with Dropbox')
                return
            }

            try {
                const url = await getDownloadUrl(file, token as string)
                if (!url) throw new Error('Could not get download URL')

                const downloadResponse = await fetch(url, {
                    method: 'GET',
                })

                if (!downloadResponse.ok) {
                    throw new Error(
                        `HTTP error! status: ${downloadResponse.status}`,
                    )
                }

                const blob = await downloadResponse.blob()
                return new File([blob], file.name, {
                    type: blob.type || 'application/octet-stream',
                })
            } catch (error) {
                onError((error as Error).message)
                return
            }
        },
        [onError, token, isValidToken],
    )

    /**
     * @description Handle submitting selected files
     * @returns {Promise<void>}
     */
    const handleSubmit = useCallback(async () => {
        if (selectedFiles.length === 0) return

        if (!isValidToken) {
            onError('Not authenticated with Dropbox')
            return
        }

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const downloadedFiles = (await downloadFiles(selectedFiles)).filter(
                Boolean,
            )

            setFiles(downloadedFiles as File[])

            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch (error) {
            onError('Error processing files: ' + (error as Error)?.message)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }, [
        downloadFiles,
        onError,
        selectedFiles,
        setActiveAdapter,
        setFiles,
        isValidToken,
    ])

    /**
     * @description Handle canceling file download
     */
    const handleCancelDownload = useCallback(() => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }, [])

    return {
        path,
        setPath,
        isClickLoading,
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        downloadProgress,
        handleCancelDownload,
    }
}
