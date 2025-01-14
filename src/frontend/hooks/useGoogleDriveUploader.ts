import { GoogleFile, Root, Token } from 'google'
import { useState } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'

function handleSelectedFilesUpdate(prevFiles: GoogleFile[], file: GoogleFile) {
    return prevFiles.includes(file)
        ? prevFiles.filter(f => f.id !== file.id)
        : [...prevFiles, file]
}

export default function useGoogleDriveUploader(token?: Token) {
    const {
        props: { onError },
        googleDriveConfigs,
        setView,
        setFiles,
    } = useRootContext()
    const [path, setPath] = useState<Root[]>([])
    const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([])
    const [showLoader, setLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)

    const handleClick = (file: GoogleFile | Root) => {
        if ('children' in file) setPath(prevPath => [...prevPath, file as Root])
        else
            setSelectedFiles(prevFiles =>
                handleSelectedFilesUpdate(prevFiles, file),
            )
    }

    const downloadFiles = async (files: GoogleFile[]) => {
        const promises = files.map(async (file, index) => {
            const downloadedFile = await downloadFile(file)

            if (downloadedFile)
                (downloadedFile as unknown as GoogleFile).thumbnailLink =
                    file.thumbnailLink
            // Update progress
            setDownloadProgress(Math.round(((index + 1) / files.length) * 100))

            return downloadedFile
        })

        return await Promise.all(promises)
    }

    const downloadFile = async (file: GoogleFile) => {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?key=${googleDriveConfigs?.google_api_key}&alt=media`,
                {
                    headers: {
                        Authorization: `Bearer ${token?.access_token}`,
                    },
                },
            )
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`)

            const blob = await response.blob()
            return new File([blob], file.name, {
                type: file.mimeType || 'application/octet-stream',
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
            setView(UploadAdapter.INTERNAL)
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
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        downloadProgress,
        handleCancelDownload,
    }
}
