'use client'

import { useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import type { OneDriveFile, OneDriveRoot } from '../lib/google-drive-utils'

const formatFileItem = (item: any) => ({
    id: item.id,
    name: item.name,
    isFolder: !!item.folder,
    children: item.folder ? [] : undefined,
    thumbnails: item.thumbnails?.[0] || null,
    '@microsoft.graph.downloadUrl': item['@microsoft.graph.downloadUrl'],
    file: item.file,
})

const getDownloadUrl = async (file: OneDriveFile, token: string): Promise<string> => {
    const fileRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}?$select=@microsoft.graph.downloadUrl`,
        { headers: { Authorization: `Bearer ${token}` } },
    )
    const fileInfo = await fileRes.json()
    if (fileInfo['@microsoft.graph.downloadUrl'])
        return fileInfo['@microsoft.graph.downloadUrl']

    throw new Error('Could not get download URL for OneDrive file')
}

export default function useOneDriveUploader(token?: string) {
    const ctx = useUploaderContext()
    const onError = (ctx as any)?.core?.options?.onError ?? ((msg: string) => console.error(msg))
    const accept = (ctx as any)?.core?.options?.accept ?? ''
    const setFiles = ctx.setFiles
    const setActiveSource = ctx.setActiveSource

    const [isClickLoading, setIsClickLoading] = useState<boolean>()
    const [path, setPath] = useState<OneDriveRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<OneDriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)

    const fetchFolderContents = async (file: OneDriveFile) => {
        if (!token) return
        setIsClickLoading(true)
        try {
            const res = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/children?$select=id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl&$expand=thumbnails`,
                { headers: { Authorization: `Bearer ${token}` } },
            )
            const data = await res.json()
            const files = (data.value || []).map(formatFileItem)
            setPath((prevPath) => [...prevPath, { ...file, children: files }])
        } catch (error) {
            onError(`Error fetching folder: ${(error as Error)?.message ?? ''}`)
        } finally {
            setIsClickLoading(false)
        }
    }

    const handleClick = async (file: OneDriveFile) => {
        if (!token) {
            onError('OneDrive graph client not initialized')
            return
        }
        if (file.isFolder) await fetchFolderContents(file)
        else
            setSelectedFiles((prevFiles) => {
                const newFiles = prevFiles.filter((f) => f.id === file.id).length
                    ? prevFiles.filter((f) => f.id !== file.id)
                    : [...prevFiles, file]
                return newFiles
            })
    }

    const downloadFile = async (file: OneDriveFile): Promise<File | undefined> => {
        try {
            if (!token) throw new Error('No token')
            const url = await getDownloadUrl(file, token)
            if (!url) throw new Error('Could not get download URL')

            const response = await fetch(url)
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`)

            const blob = await response.blob()
            return new File([blob], file.name, {
                type: file.file?.mimeType ?? 'application/octet-stream',
            })
        } catch (error) {
            onError((error as Error).message)
            return undefined
        }
    }

    const downloadFiles = async (files: OneDriveFile[]) => {
        const promises = files.map(async (file, index) => {
            const downloadedFile = await downloadFile(file)
            if (file.thumbnails?.large?.url && downloadedFile)
                Object.defineProperty(downloadedFile, 'thumbnailLink', {
                    value: file.thumbnails.large.url,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                })
            setDownloadProgress(Math.round(((index + 1) / files.length) * 100))
            return downloadedFile
        })
        return await Promise.all(promises)
    }

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return
        setShowLoader(true)
        setDownloadProgress(0)
        try {
            const downloadedFiles = (await downloadFiles(selectedFiles)).filter(
                Boolean,
            ) as File[]
            await setFiles(downloadedFiles)
            setSelectedFiles([])
            setActiveSource(null)
        } catch (error) {
            onError(`Error processing files: ${(error as Error)?.message ?? ''}`)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }

    const handleCancelDownload = () => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }

    const getAllFilesRecursively = async (rootFolderId: string): Promise<OneDriveFile[]> => {
        if (!token) return []
        const files: OneDriveFile[] = []
        const queue: string[] = [rootFolderId]
        while (queue.length) {
            const folderId = queue.shift()!
            const res = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl&$expand=thumbnails`,
                { headers: { Authorization: `Bearer ${token}` } },
            )
            const data = await res.json()
            const children: OneDriveFile[] = (data.value || []).map(formatFileItem)
            for (const child of children) {
                if (child.isFolder) queue.push(child.id)
                else files.push(child)
            }
        }
        return files
    }

    const submitFiles = async (files: OneDriveFile[]) => {
        if (!files?.length) return
        setShowLoader(true)
        setDownloadProgress(0)
        try {
            const filtered = files.filter((f) => {
                if (!accept || accept === '*') return true
                const ext = f.name.split('.').pop() || ''
                return accept.includes(ext)
            })
            const downloadedFiles = (await downloadFiles(filtered)).filter(
                Boolean,
            ) as File[]
            await setFiles(downloadedFiles)
            setSelectedFiles([])
            setActiveSource(null)
        } catch (error) {
            onError(`Error processing files: ${(error as Error)?.message ?? ''}`)
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }

    const onSelectCurrentFolder = async () => {
        try {
            const current = path[path.length - 1]
            if (!current) return
            if (!token) {
                onError('OneDrive graph client not initialized')
                return
            }
            const files = await getAllFilesRecursively(current.id)
            await submitFiles(files)
        } catch (error) {
            onError(`Error selecting folder: ${(error as Error)?.message ?? ''}`)
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
