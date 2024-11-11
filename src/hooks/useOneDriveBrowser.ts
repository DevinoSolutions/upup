import { Client } from '@microsoft/microsoft-graph-client'
import { useConfigContext } from 'context/config-context'
import {
    onedriveFetchFileInfo,
    onedriveFetchFiles,
    onedriveFetchPermission,
    onedriveFetchUpdatedFile,
} from 'lib/onedrive'
import { useEffect, useState } from 'react'
import { Adapter, OneDriveFile, OneDriveRoot } from 'types'
import { useDebouncedCallback } from 'use-debounce'

interface useOneDriveBrowserProps {
    oneDriveFiles?: OneDriveRoot
    graphClient?: Client
}

export default function useOneDriveBrowser({
    oneDriveFiles,
    graphClient,
}: useOneDriveBrowserProps) {
    const { setFiles, setActiveAdapter } = useConfigContext()

    const [path, setPath] = useState<OneDriveRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<OneDriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState<number>(0)
    const [folderLoading, setFolderLoading] = useState<string>()
    const [fileSelecting, setFileSelecting] = useState<string>()

    const fetchFolderContents = async (file: OneDriveFile) => {
        try {
            setFolderLoading(file.id)
            const files = await onedriveFetchFiles(graphClient, file.id)

            setPath(prevPath => [...prevPath, { ...file, children: files }])
        } catch (error) {
            console.error('Error fetching folder contents:', error)
        } finally {
            setFolderLoading(undefined)
        }
    }

    const fetchFile = async (file: OneDriveFile) => {
        try {
            setFileSelecting(file.id)
            const updatedFile = await onedriveFetchUpdatedFile(
                file,
                graphClient,
            )

            setSelectedFiles(prevFiles => {
                const newFiles = prevFiles.some(f => f.id === file.id)
                    ? prevFiles.filter(f => f.id !== file.id)
                    : [...prevFiles, updatedFile]
                return newFiles
            })
        } catch (error) {
            console.error(
                `Error fetching file information for ${file.name}:`,
                error,
            )
        } finally {
            setFileSelecting(undefined)
        }
    }

    const handleClick = useDebouncedCallback(async (file: OneDriveFile) => {
        if (!graphClient) {
            console.error('Graph client not initialized')
            return
        }

        if (file.isFolder) fetchFolderContents(file)
        else fetchFile(file)
    }, 500)

    const getDownloadUrl = async (file: OneDriveFile) => {
        // First try to get direct download URL
        const fileInfo = await onedriveFetchFileInfo(file.id, graphClient)

        if (fileInfo['@microsoft.graph.downloadUrl'])
            return fileInfo['@microsoft.graph.downloadUrl']

        // Fallback to creating a sharing link
        const permission = await onedriveFetchPermission(file.id, graphClient)

        const shareId = permission.link.webUrl.split('/s!/')[1]
        const sharedItem = await graphClient
            ?.api(`/shares/u!${shareId}`)
            .expand('driveItem')
            .get()

        return sharedItem.driveItem['@microsoft.graph.downloadUrl']
    }

    const downloadFile = async (
        url: string,
        fileName: string,
        mimeType = 'application/octet-stream',
    ) => {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        })

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`)

        const blob = await response.blob()
        return new File([blob], fileName, {
            type: mimeType || 'application/octet-stream',
        })
    }

    const downloadFiles = async (files: OneDriveFile[]) => {
        const promises = files.map(async (file, index) => {
            try {
                const downloadUrl = await getDownloadUrl(file)
                if (!downloadUrl) throw new Error('Could not get download URL')

                const downloadedFile = await downloadFile(
                    downloadUrl,
                    file.name,
                    file.file?.mimeType,
                )

                // Add thumbnail if available
                if (file.thumbnails?.large?.url)
                    Object.defineProperty(downloadedFile, 'thumbnailLink', {
                        value: file.thumbnails.large.url,
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    })

                // Update progress
                setDownloadProgress(
                    Math.round(((index + 1) / files.length) * 100),
                )

                return downloadedFile
            } catch (error) {
                console.error(`Error downloading file ${file.name}:`, error)
                throw new Error(
                    `Failed to download ${file.name}: ${
                        (error as Error).message
                    }`,
                )
            }
        })

        try {
            return await Promise.all(promises)
        } catch (error) {
            console.error('Error in downloadFiles:', error)
            throw error
        }
    }

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            // Process one file at a time
            const downloadedFiles: File[] = []

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i]
                const [downloadedFile] = await downloadFiles([file])
                downloadedFiles.push(downloadedFile)

                // Update progress
                const progress = Math.round(
                    ((i + 1) / selectedFiles.length) * 100,
                )
                setDownloadProgress(progress)

                // Add a small delay between files
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            // Update the files state
            setFiles(prevFiles => [...prevFiles, ...downloadedFiles])

            // Clear selection and return to internal view
            setSelectedFiles([])
            setDownloadProgress(0)
            setActiveAdapter(Adapter.INTERNAL)
        } catch (error) {
            console.error('Error processing files:', error)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }

    useEffect(() => {
        if (oneDriveFiles) setPath([oneDriveFiles])
    }, [oneDriveFiles])

    return {
        path,
        setPath,
        selectedFiles,
        setSelectedFiles,
        handleClick,
        handleSubmit,
        showLoader,
        downloadProgress,
        setDownloadProgress,
        folderLoading,
        fileSelecting,
    }
}
