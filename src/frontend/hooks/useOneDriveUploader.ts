import { Client } from '@microsoft/microsoft-graph-client'
import { OneDriveFile, OneDriveRoot } from 'microsoft'
import { useState } from 'react'
import { useRootContext } from '../context/RootContext'

const formatFileItem = (item: any) => ({
    id: item.id,
    name: item.name,
    isFolder: !!item.folder,
    children: item.folder ? [] : undefined,
    thumbnails: item.thumbnails?.[0] || null,
    '@microsoft.graph.downloadUrl': item['@microsoft.graph.downloadUrl'],
    file: item.file,
})

const getDownloadUrl = async (file: OneDriveFile, graphClient: Client) => {
    // First try to get direct download URL
    const fileInfo = await graphClient
        .api(`/me/drive/items/${file.id}`)
        .select('@microsoft.graph.downloadUrl')
        .get()

    if (fileInfo['@microsoft.graph.downloadUrl'])
        return fileInfo['@microsoft.graph.downloadUrl']

    // Fallback to creating a sharing link
    const permission = await graphClient
        .api(`/me/drive/items/${file.id}/createLink`)
        .post({
            type: 'view',
            scope: 'anonymous',
        })

    const shareId = permission.link.webUrl.split('/s!/')[1]
    const sharedItem = await graphClient
        .api(`/shares/u!${shareId}`)
        .expand('driveItem')
        .get()

    return sharedItem.driveItem['@microsoft.graph.downloadUrl']
}

export default function useOneDriveUploader(graphClient?: Client) {
    const {
        setFiles,
        setActiveAdapter,
        props: { onError },
    } = useRootContext()
    const [isClickLoading, setIsClickLoading] = useState<boolean>()
    const [path, setPath] = useState<OneDriveRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<OneDriveFile[]>([])
    const [showLoader, setLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)

    const fetchFolderContents = async (file: OneDriveFile) => {
        setIsClickLoading(true)
        try {
            const response = await graphClient
                ?.api(`/me/drive/items/${file.id}/children`)
                .select(
                    'id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl',
                )
                .expand('thumbnails')
                .get()

            const files = response.value.map(formatFileItem)
            setPath(prevPath => [...prevPath, { ...file, children: files }])
        } catch (error) {
            onError('Error fetching folder contents:' + error)
        } finally {
            setIsClickLoading(false)
        }
    }

    const handleClick = async (file: OneDriveFile) => {
        if (!graphClient) {
            onError('Graph client not initialized')
            return
        }

        if (file.isFolder) await fetchFolderContents(file)
        else
            setSelectedFiles(prevFiles => {
                const newFiles = prevFiles.filter(f => f.id === file.id).length
                    ? prevFiles.filter(f => f.id !== file.id)
                    : [...prevFiles, file]
                return newFiles
            })
    }

    const downloadFiles = async (files: OneDriveFile[]) => {
        const promises = files.map(async (file, index) => {
            const downloadedFile = await downloadFile(file)

            // Add thumbnail if available
            if (file.thumbnails?.large?.url)
                Object.defineProperty(downloadedFile, 'thumbnailLink', {
                    value: file.thumbnails.large.url,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                })

            // Update progress
            setDownloadProgress(Math.round(((index + 1) / files.length) * 100))

            return downloadedFile
        })

        return await Promise.all(promises)
    }

    const downloadFile = async (file: OneDriveFile) => {
        try {
            const url = await getDownloadUrl(file, graphClient!)
            if (!url) throw new Error('Could not get download URL')

            const response = await fetch(url, {
                method: 'GET',
            })
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`)

            const blob = await response.blob()
            return new File([blob], file.name, {
                type: file.file?.mimeType || 'application/octet-stream',
            })
        } catch (error) {
            onError((error as Error).message)
            return
        }
    }

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return

        setLoader(true)
        setDownloadProgress(0)

        try {
            const downloadedFiles = await (
                await downloadFiles(selectedFiles)
            ).filter(Boolean)

            // Update the files state
            setFiles(downloadedFiles as File[])

            // Clear selection and return to internal view
            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch (error) {
            onError('Error processing files:' + error)
        } finally {
            setLoader(false)
            setDownloadProgress(0)
        }
    }

    const handleCancelDownload = () => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }

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
