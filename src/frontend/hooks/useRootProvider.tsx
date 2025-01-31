import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import checkFileType from '../../shared/lib/checkFileType'
import { UploadAdapter, UpupUploaderProps } from '../../shared/types'
import { UploadStatus } from '../context/RootContext'
import {
    checkFileSize,
    compressFile,
    fileAppendId,
    getUniqueFilesByName,
    sizeToBytes,
} from '../lib/file'
import { ProviderSDK } from '../lib/storage/provider'
import { cn } from '../lib/tailwind'

interface FileWithId extends File {
    id?: string
}

type FileProgress = {
    id: string
    loaded: number
    total: number
}

export type FilesProgressMap = Record<string, FileProgress>

export default function useRootProvider({
    accept = '*',
    mini = false,
    dark = false,
    limit: propLimit = 1,
    maxFileSize = { size: 10, unit: 'MB' },
    loader = <p className={cn({ 'text-[#6D6D6D]': dark })}>loading...</p>,
    shouldCompress = false,
    uploadAdapters = [UploadAdapter.INTERNAL, UploadAdapter.LINK],
    onError = toast.error,
    onWarn = toast.warning,
    onIntegrationClick = () => {},
    onFileClick = () => {},
    onCancelUpload = () => {},
    onFileRemove = () => {},
    onFileDragOver = () => {},
    onFileDragLeave = () => {},
    onFileDrop = () => {},
    onFileTypeMismatch = () => {},
    onFileUploadStart = () => {},
    onFileUploadProgress = () => {},
    onFilesUploadProgress = () => {},
    onFileUploadComplete = () => {},
    onFilesUploadComplete = () => {},
    onFilesSelected = () => {},
    onPrepareFiles,
    provider,
    tokenEndpoint,
    driveConfigs,
}: UpupUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isAddingMore, setIsAddingMore] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [activeAdapter, setActiveAdapter] = useState<UploadAdapter>()
    const limit = mini ? 1 : Math.max(propLimit, 1)
    const multiple = mini ? false : limit > 1
    const [uploadStatus, setUploadStatus] = useState(UploadStatus.PENDING)
    const [filesProgressMap, setFilesProgressMap] = useState<FilesProgressMap>(
        {} as FilesProgressMap,
    )
    const totalProgress = useMemo(() => {
        const filesProgressMapValues = Object.values(filesProgressMap)
        if (!filesProgressMapValues.length) return 0

        const loadedValues = filesProgressMapValues.reduce(
            (a, b) => a + (b.loaded / b.total) * 100,
            0,
        )
        return Math.round(loadedValues / filesProgressMapValues.length)
    }, [filesProgressMap])
    const compressFiles = async (files: File[]): Promise<File[]> => {
        try {
            return await Promise.all(
                files.map(async file => {
                    const compressed = await compressFile(file)
                    return compressed
                }),
            )
        } catch (error) {
            files.forEach(file => onError(`Error compressing ${file.name}`))
            throw error
        }
    }

    const proceedUpload = async () => {
        if (!selectedFiles.length) return
        setUploadStatus(UploadStatus.ONGOING)

        try {
            const compressedFiles = shouldCompress
                ? await compressFiles(selectedFiles)
                : selectedFiles

            const processedFiles = onPrepareFiles
                ? await onPrepareFiles(compressedFiles)
                : compressedFiles

            // Initialize SDK
            let sdk = new ProviderSDK({
                provider,
                tokenEndpoint,
                constraints: {
                    multiple,
                    accept,
                    maxFileSize: sizeToBytes(
                        maxFileSize.size,
                        maxFileSize.unit,
                    ),
                },
            })

            // Upload files
            const uploadResults = await Promise.all(
                processedFiles.map(file =>
                    sdk.upload(file, {
                        onFileUploadStart,
                        onFileUploadProgress: (file, progress) => {
                            setFilesProgressMap(prev => ({
                                ...prev,
                                [file.name]: {
                                    ...prev[file.name],
                                    loaded: progress.loaded,
                                },
                            }))
                            onFileUploadProgress(file, progress)
                        },
                        onFileUploadComplete,
                        onError,
                        onFilesUploadProgress: (completedFiles: number) =>
                            onFilesUploadProgress(
                                completedFiles,
                                processedFiles.length,
                            ),
                    }),
                ),
            )

            // Extract keys from results
            const uploadedFileKeys = uploadResults.map(result => result.key)
            onFilesUploadComplete(uploadedFileKeys)

            setUploadStatus(UploadStatus.SUCCESSFUL)
            return uploadedFileKeys
        } catch (error) {
            onError((error as Error).message)
            setUploadStatus(UploadStatus.FAILED)
            return
        }
    }

    useEffect(() => {
        setFilesProgressMap(
            selectedFiles.reduce((a, b) => {
                a[b.name] = {
                    id: b.name,
                    loaded: 0,
                    total: b.size,
                }
                return a
            }, {} as FilesProgressMap),
        )
    }, [selectedFiles.length])

    const handleSetSelectedFiles = (newFiles: File[], reset = false) => {
        onFilesSelected(newFiles)
        if (reset) return setSelectedFiles([])

        let validFilesByType = [] as File[]
        for (let file of newFiles) {
            if (checkFileType(accept, file)) validFilesByType.push(file)
            else {
                onError(`${file.name} has an invalid type!`)
                onFileTypeMismatch(file, accept)
            }
        }

        let validFilesBySize = [] as File[]
        for (let file of validFilesByType) {
            if (checkFileSize(file, maxFileSize)) validFilesBySize.push(file)
            else onError(`${file.name} has an invalid type!`)
        }

        const filesWithIds = validFilesBySize.map(fileAppendId)
        if (filesWithIds.length)
            setSelectedFiles(prev =>
                multiple
                    ? getUniqueFilesByName({
                          files: [...prev, ...filesWithIds],
                          onWarn,
                      }).slice(0, limit)
                    : [filesWithIds[0]],
            )

        setIsAddingMore(false)
    }

    const handleFileRemove = (file: FileWithId) => {
        setSelectedFiles(prev => prev.filter(f => f.name !== file.name))
        onFileRemove(file)
    }

    return {
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        files: selectedFiles,
        setFiles: handleSetSelectedFiles,
        handleFileRemove,
        oneDriveConfigs: driveConfigs?.oneDrive,
        googleDriveConfigs: driveConfigs?.googleDrive,
        upload: {
            totalProgress,
            filesProgressMap,
            proceedUpload,
            uploadStatus,
        },
        props: {
            mini,
            dark,
            loader,
            onError,
            onIntegrationClick,
            onFileClick,
            onCancelUpload,
            onFileDragOver,
            onFileDragLeave,
            onFileDrop,
            onFileTypeMismatch,
            uploadAdapters,
            accept,
            maxFileSize,
            limit,
            multiple,

            shouldCompress,
            provider,
            tokenEndpoint,
            onFileUploadStart,
            onFileUploadProgress,
            onFilesUploadProgress,
            onFileUploadComplete,
            onFilesUploadComplete,
            onPrepareFiles,
        },
    }
}
