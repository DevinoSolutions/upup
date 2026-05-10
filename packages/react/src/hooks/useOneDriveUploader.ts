import { Client } from '@microsoft/microsoft-graph-client'
import { OneDriveFile, OneDriveRoot } from 'microsoft'
import { useState } from 'react'
import { t } from '../shared/i18n'
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
        core,
        setFiles,
        setActiveAdapter,
        props: { onError, allowedFileTypes },
        translations,
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
                t(translations.errorProcessingFiles, {
                    message: (error as Error)?.message ?? '',
                }),
            )
            // v2: emit folder fetch error via UpupCore
            core?.emit('onedrive-folder-fetch-error', { error })
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
            onError(translations.graphClientNotInitialized)
            // v2: emit graph-not-ready error via UpupCore
            core?.emit('onedrive-graph-not-ready', { action: 'click' })
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
            // v2: emit download error via UpupCore
            core?.emit('onedrive-download-error', { error, fileName: file.name })
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
            // v2: emit onedrive-files-submit event via UpupCore
            core?.emit('onedrive-files-submit', { files: downloadedFiles as File[] })
        } catch (error) {
            onError(
                t(translations.errorProcessingFiles, {
                    message: (error as Error)?.message ?? '',
                }),
            )
            // v2: emit submit error via UpupCore
            core?.emit('onedrive-submit-error', { error })
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
                if (!allowedFileTypes || allowedFileTypes === '*') return true
                const ext = f.name.split('.').pop() || ''
                return allowedFileTypes.includes(ext)
            })
            const downloadedFiles = (await downloadFiles(filtered)).filter(
                Boolean,
            )
            setFiles(downloadedFiles as File[])
            setSelectedFiles([])
            setActiveAdapter(undefined)
            // v2: emit onedrive-folder-submit event via UpupCore when a whole folder is submitted
            core?.emit('onedrive-folder-submit', { count: downloadedFiles.length })
        } catch (error) {
            onError(
                t(translations.errorProcessingFiles, {
                    message: (error as Error)?.message ?? '',
                }),
            )
            // v2: emit folder submit error via UpupCore
            core?.emit('onedrive-folder-submit-error', { error })
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }
    const handleCancelDownload = () => {
        setSelectedFiles([])
        setDownloadProgress(0)
        // v2: emit onedrive-cancel event via UpupCore
        core?.emit('onedrive-cancel', {})
    }

    const onSelectCurrentFolder = async () => {
        try {
            const current = path[path.length - 1]
            if (!current) return
            if (!graphClient) {
                onError(translations.graphClientNotInitialized)
                // v2: emit graph-not-ready error via UpupCore
                core?.emit('onedrive-graph-not-ready', { action: 'select-folder' })
                return
            }
            const files = await getAllFilesRecursively(current.id)
            await submitFiles(files)
        } catch (error) {
            onError(
                t(translations.errorSelectingFolder, {
                    message: (error as Error)?.message ?? '',
                }),
            )
            // v2: emit folder select error via UpupCore
            core?.emit('onedrive-folder-select-error', { error })
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
