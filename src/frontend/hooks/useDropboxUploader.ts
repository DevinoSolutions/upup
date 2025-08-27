import { DropboxFile, DropboxRoot } from 'dropbox'
import { useCallback, useState } from 'react'
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
        props: { onError, accept },
        setActiveAdapter,
        setFiles,
    } = useRootContext()
    const [path, setPath] = useState<DropboxRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<DropboxFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState<boolean>(false)

    const fetchFolderContents = useCallback(
        async (file: DropboxFile) => {
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
        [token, onError],
    )

    /**
     * @description Handle clicking on a file or folder
     * @param {DropboxFile} file - The clicked file or folder
     * @returns {Promise<void>}
     */
    const handleClick = useCallback(
        async (file: DropboxFile) => {
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
        [fetchFolderContents],
    )
    /**
     * @description Download a single file
     * @param {DropboxFile} file - The file to download
     * @returns {Promise<File|undefined>} - The downloaded file or undefined if error
     */
    const downloadFile = useCallback(
        async (file: DropboxFile, token: string) => {
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
        [onError],
    )

    const downloadFiles = useCallback(
        async (files: DropboxFile[], token?: string) => {
            if (!token) {
                onError('No access token provided for Dropbox download')
                return
            }
            const promises = files.map(async (file, index) => {
                const downloadedFile = await downloadFile(file, token)

                setDownloadProgress(
                    Math.round(((index + 1) / files.length) * 100),
                )

                return downloadedFile
            })

            return await Promise.all(promises)
        },
        [downloadFile, onError],
    )

    /**
     * @description Handle submitting selected files
     * @returns {Promise<void>}
     */
    const handleSubmit = useCallback(async () => {
        if (selectedFiles.length === 0) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const downloadedFiles = (
                await downloadFiles(selectedFiles, token)
            )?.filter(Boolean)

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
        token,
    ])

    /**
     * @description Handle canceling file download
     */
    const handleCancelDownload = useCallback(() => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }, [])

    const handleSubmitWithFiles = useCallback(
        async (files: DropboxFile[]) => {
            if (!files?.length) return
            setShowLoader(true)
            setDownloadProgress(0)
            try {
                const filtered = files.filter(f => {
                    if (!accept || accept === '*') return true
                    const ext = f.name.split('.').pop() || ''
                    return accept.includes(ext)
                })
                const downloadedFiles = (
                    await downloadFiles(filtered, token)
                )?.filter(Boolean)
                setFiles(downloadedFiles as File[])
                setSelectedFiles([])
                setActiveAdapter(undefined)
            } catch (error) {
                onError('Error processing files: ' + (error as Error)?.message)
            } finally {
                setShowLoader(false)
                setDownloadProgress(0)
            }
        },
        [accept, downloadFiles, onError, setActiveAdapter, setFiles, token],
    )

    const onSelectCurrentFolder = useCallback(async () => {
        try {
            const current = path[path.length - 1]
            if (!current) return

            const collectAllFiles = async (folderPath: string) => {
                if (!token) throw new Error('No access token')

                const initial = await fetch(
                    'https://api.dropboxapi.com/2/files/list_folder',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            path: folderPath,
                            recursive: true,
                            include_media_info: true,
                        }),
                    },
                )
                let data = await initial.json()
                if (!initial.ok)
                    throw new Error(
                        data.error_summary || 'Failed to fetch folder',
                    )

                let entries = data.entries || []
                while (data.has_more) {
                    const cont = await fetch(
                        'https://api.dropboxapi.com/2/files/list_folder/continue',
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ cursor: data.cursor }),
                        },
                    )
                    data = await cont.json()
                    if (!cont.ok)
                        throw new Error(
                            data.error_summary || 'Failed to continue list',
                        )
                    entries = entries.concat(data.entries || [])
                }

                // Map and filter only files
                return entries
                    .map(formatFileItem)
                    .filter((e: DropboxFile) => !e.isFolder)
            }

            const startPath = (current as any).path_display || '/'
            const files = await collectAllFiles(startPath)
            await handleSubmitWithFiles(files)
        } catch (error) {
            onError('Error selecting folder: ' + (error as Error)?.message)
        }
    }, [handleSubmitWithFiles, onError, path, token])

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
        onSelectCurrentFolder,
    }
}
