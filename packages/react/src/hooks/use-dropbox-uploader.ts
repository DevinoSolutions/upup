'use client'

import { useCallback, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import type { DropboxFile, DropboxRoot } from '../lib/google-drive-utils'

const formatFileItem = (entry: any): DropboxFile => ({
    id: entry.id,
    name: entry.name,
    path_display: entry.path_display,
    isFolder: entry['.tag'] === 'folder',
    size: entry.size,
    thumbnailLink: null,
})

const getDownloadUrl = async (file: DropboxFile, token: string): Promise<string> => {
    const response = await fetch(
        'https://api.dropboxapi.com/2/files/get_temporary_link',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: file.path_display }),
        },
    )
    const data = await response.json()
    if (!response.ok) {
        throw new Error(data.error_summary || 'Failed to get temporary link')
    }
    return data.link
}

export default function useDropboxUploader(token?: string | null) {
    const ctx = useUploaderContext()
    const onError = ctx.core.options.onError ?? ((msg: string) => console.error(msg))
    const accept = ctx.core.options.accept ?? ''
    const setFiles = ctx.setFiles
    const setActiveSource = ctx.setActiveSource

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
                setPath((prevPath) => [
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

    const handleClick = useCallback(
        async (file: DropboxFile) => {
            if (file.isFolder) {
                await fetchFolderContents(file)
            } else {
                setSelectedFiles((prevFiles) => {
                    const isSelected = prevFiles.some((f) => f.id === file.id)
                    return isSelected
                        ? prevFiles.filter((f) => f.id !== file.id)
                        : [...prevFiles, file]
                })
            }
        },
        [fetchFolderContents],
    )

    const downloadFile = useCallback(
        async (file: DropboxFile, tok: string): Promise<File | undefined> => {
            try {
                const url = await getDownloadUrl(file, tok)
                if (!url) throw new Error('Could not get download URL')
                const downloadResponse = await fetch(url)
                if (!downloadResponse.ok) {
                    throw new Error(`HTTP error! status: ${downloadResponse.status}`)
                }
                const blob = await downloadResponse.blob()
                return new File([blob], file.name, {
                    type: blob.type || 'application/octet-stream',
                })
            } catch (error) {
                onError((error as Error).message)
                return undefined
            }
        },
        [onError],
    )

    const downloadFiles = useCallback(
        async (files: DropboxFile[], tok?: string | null) => {
            if (!tok) {
                onError('No Dropbox access token available')
                return
            }
            const promises = files.map(async (file, index) => {
                const downloadedFile = await downloadFile(file, tok)
                setDownloadProgress(
                    Math.round(((index + 1) / files.length) * 100),
                )
                return downloadedFile
            })
            return await Promise.all(promises)
        },
        [downloadFile, onError],
    )

    const handleSubmit = useCallback(async () => {
        if (selectedFiles.length === 0) return
        setShowLoader(true)
        setDownloadProgress(0)
        try {
            const downloadedFiles = (
                await downloadFiles(selectedFiles, token)
            )?.filter(Boolean) as File[]
            await setFiles(downloadedFiles)
            setSelectedFiles([])
            setActiveSource(null)
        } catch (error) {
            onError(`Error processing files: ${(error as Error)?.message ?? ''}`)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }, [downloadFiles, onError, selectedFiles, setActiveSource, setFiles, token])

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
                const filtered = files.filter((f) => {
                    if (!accept || accept === '*') return true
                    const ext = f.name.split('.').pop() || ''
                    return accept.includes(ext)
                })
                const downloadedFiles = (
                    await downloadFiles(filtered, token)
                )?.filter(Boolean) as File[]
                await setFiles(downloadedFiles)
                setSelectedFiles([])
                setActiveSource(null)
            } catch (error) {
                onError(`Error processing files: ${(error as Error)?.message ?? ''}`)
            } finally {
                setShowLoader(false)
                setDownloadProgress(0)
            }
        },
        [accept, downloadFiles, onError, setActiveSource, setFiles, token],
    )

    const onSelectCurrentFolder = useCallback(async () => {
        try {
            const current = path[path.length - 1]
            if (!current) return

            const collectAllFiles = async (folderPath: string): Promise<DropboxFile[]> => {
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
                    throw new Error(data.error_summary || 'Failed to fetch folder')

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
                        throw new Error(data.error_summary || 'Failed to continue list')
                    entries = entries.concat(data.entries || [])
                }

                return entries
                    .map(formatFileItem)
                    .filter((e: DropboxFile) => !e.isFolder)
            }

            const startPath = (current as any).path_display || '/'
            const files = await collectAllFiles(startPath)
            await handleSubmitWithFiles(files)
        } catch (error) {
            onError(`Error selecting folder: ${(error as Error)?.message ?? ''}`)
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
