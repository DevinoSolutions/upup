import { GoogleFile, Root, Token } from 'google'
import { useState } from 'react'
import { useRootContext } from '../context/RootContext'

function handleSelectedFilesUpdate(prevFiles: GoogleFile[], file: GoogleFile) {
    return prevFiles.includes(file)
        ? prevFiles.filter(f => f.id !== file.id)
        : [...prevFiles, file]
}

export default function useGoogleDriveUploader(token?: Token) {
    const {
        props: { onError, accept },
        googleDriveConfigs,
        setActiveAdapter,
        setFiles,
    } = useRootContext()
    const [path, setPath] = useState<Root[]>([])
    const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
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
            onError((error as Error)?.message)
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

    const submitFiles = async (files: GoogleFile[]) => {
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

            const files: GoogleFile[] = []
            const walk = (node: GoogleFile | Root) => {
                if ('children' in node && Array.isArray(node.children))
                    node.children.forEach(child => walk(child as any))
                else files.push(node as GoogleFile)
            }
            walk(current as any)

            await submitFiles(files)
        } catch (error) {
            onError('Error selecting folder: ' + (error as Error)?.message)
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
