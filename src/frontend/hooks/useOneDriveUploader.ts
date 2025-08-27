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
        props: { onError, accept },
    } = useRootContext()
    const [isClickLoading, setIsClickLoading] = useState<boolean>()
    const [path, setPath] = useState<OneDriveRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<OneDriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
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
            onError(
                'Error fetching folder contents:' + (error as Error)?.message,
            )
        } finally {
            setIsClickLoading(false)
        }
    }

    const fetchChildren = async (folderId: string) => {
        const response = await graphClient
            ?.api(`/me/drive/items/${folderId}/children`)
            .select(
                'id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl',
            )
            .expand('thumbnails')
            .get()
        return response.value.map(formatFileItem) as OneDriveFile[]
    }

    const getAllFilesRecursively = async (rootFolderId: string) => {
        const files: OneDriveFile[] = []
        const queue: string[] = [rootFolderId]
        while (queue.length) {
            const folderId = queue.shift()!
            const children = await fetchChildren(folderId)
            for (const child of children) {
                if (child.isFolder) queue.push(child.id)
                else files.push(child)
            }
        }
        return files
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
                type: file.file?.mimeType ?? 'application/octet-stream',
            })
        } catch (error) {
            onError((error as Error).message)
            return
        }
    }

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const downloadedFiles = (await downloadFiles(selectedFiles)).filter(
                Boolean,
            )

            // Update the files state
            setFiles(downloadedFiles as File[])

            // Clear selection and return to internal view
            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch (error) {
            onError('Error processing files:' + (error as Error)?.message)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }

    const submitFiles = async (files: OneDriveFile[]) => {
        if (!files?.length) return
        setShowLoader(true)
        setDownloadProgress(0)
        try {
            const filtered = files.filter(f => {
                if (!accept || accept === '*') return true
                const ext = f.name.split('.').pop() || ''
                return accept.includes(ext)
            })
            const downloadedFiles = (await downloadFiles(filtered)).filter(
                Boolean,
            )
            setFiles(downloadedFiles as File[])
            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch (error) {
            onError('Error processing files:' + (error as Error)?.message)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }
    const handleCancelDownload = () => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }

    const onSelectCurrentFolder = async () => {
        try {
            const current = path[path.length - 1]
            if (!current) return
            if (!graphClient) {
                onError('Graph client not initialized')
                return
            }
            const files = await getAllFilesRecursively(current.id)
            await submitFiles(files)
        } catch (error) {
            onError('Error selecting folder: ' + (error as Error)?.message)
        }
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
        onSelectCurrentFolder,
    }
}
