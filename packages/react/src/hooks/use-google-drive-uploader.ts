'use client'

import { useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import type { GoogleFile, GoogleRoot, GoogleToken } from '../lib/google-drive-utils'
import { getWorkspaceExportInfo, isDriveFileAccepted } from '../lib/google-drive-utils'

function handleSelectedFilesUpdate(prevFiles: GoogleFile[], file: GoogleFile) {
    return prevFiles.includes(file)
        ? prevFiles.filter((f) => f.id !== file.id)
        : [...prevFiles, file]
}

export default function useGoogleDriveUploader(
    token?: GoogleToken,
    googleApiKey?: string,
) {
    const ctx = useUploaderContext()
    const onError = (ctx as any)?.core?.options?.onError ?? ((msg: string) => console.error(msg))
    const accept = (ctx as any)?.core?.options?.accept ?? ''
    const setFiles = ctx.setFiles
    const setActiveSource = ctx.setActiveSource

    const [path, setPath] = useState<GoogleRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)

    const handleClick = (file: GoogleFile | GoogleRoot) => {
        if ('children' in file)
            setPath((prevPath) => [...prevPath, file as GoogleRoot])
        else
            setSelectedFiles((prevFiles) =>
                handleSelectedFilesUpdate(prevFiles, file as GoogleFile),
            )
    }

    const downloadFile = async (file: GoogleFile): Promise<File | undefined> => {
        try {
            const exportInfo = getWorkspaceExportInfo(file.mimeType)
            let url: string
            let fileName: string
            let fileType: string

            if (exportInfo) {
                url = exportInfo.exportUrl(file.id)
                fileName = file.name.endsWith(`.${exportInfo.extension}`)
                    ? file.name
                    : `${file.name}.${exportInfo.extension}`
                fileType = exportInfo.exportMimeType
            } else {
                url = `https://www.googleapis.com/drive/v3/files/${file.id}?key=${googleApiKey}&alt=media`
                fileName = file.name
                fileType = file.mimeType || 'application/octet-stream'
            }

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token?.access_token}`,
                },
            })

            if (!response.ok) {
                const body = await response.text().catch(() => '')
                throw new Error(
                    `HTTP error! status: ${response.status}${body ? ` - ${body}` : ''}`,
                )
            }

            const blob = await response.blob()
            return new File([blob], fileName, { type: fileType })
        } catch (error) {
            onError((error as Error)?.message)
            return undefined
        }
    }

    const downloadFiles = async (files: GoogleFile[]) => {
        const promises = files.map(async (file, index) => {
            const downloadedFile = await downloadFile(file)
            if (downloadedFile)
                (downloadedFile as unknown as GoogleFile).thumbnailLink =
                    file.thumbnailLink
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

    const submitFiles = async (files: GoogleFile[]) => {
        if (!files?.length) return
        setShowLoader(true)
        setDownloadProgress(0)
        try {
            const filtered = files.filter((f) => isDriveFileAccepted(f, accept))
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

    const handleCancelDownload = () => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }

    const onSelectCurrentFolder = async () => {
        try {
            const current = path[path.length - 1]
            if (!current) return
            const files: GoogleFile[] = []
            const walk = (node: GoogleFile | GoogleRoot) => {
                if ('children' in node && Array.isArray(node.children))
                    node.children.forEach((child) => walk(child as any))
                else files.push(node as GoogleFile)
            }
            walk(current as any)
            await submitFiles(files)
        } catch (error) {
            onError(`Error selecting folder: ${(error as Error)?.message ?? ''}`)
        }
    }

    return {
        path,
        setPath,
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        downloadProgress,
        handleCancelDownload,
        onSelectCurrentFolder,
    }
}
