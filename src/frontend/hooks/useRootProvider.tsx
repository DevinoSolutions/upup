import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import checkFileType from '../../shared/lib/checkFileType'
import { UploadAdapter, UpupUploaderProps } from '../../shared/types'
import {
    checkFileSize,
    compressFile,
    fileAppendId,
    getUniqueFilesByName,
    sizeToBytes,
} from '../lib/file'
import { ProviderSDK } from '../lib/storage/provider'

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
    limit: propLimit = 1,
    maxFileSize = { size: 10, unit: 'MB' },
    loader = <p>loading...</p>,
    shouldCompress = false,
    uploadAdapters = [UploadAdapter.INTERNAL, UploadAdapter.LINK],
    onError = console.error,
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
    const [isUploading, setIsUploading] = useState(false)
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
        return loadedValues / filesProgressMapValues.length
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
        setIsUploading(true)

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
            return uploadedFileKeys
        } catch (error) {
            onError((error as Error).message)
            return
        } finally {
            setIsUploading(false)
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
            if (checkFileType(accept, file, onFileTypeMismatch))
                validFilesByType.push(file)
            else toast.error(`${file.name} has an invalid type!`)
        }

        let validFilesBySize = [] as File[]
        for (let file of validFilesByType) {
            if (checkFileSize(file, maxFileSize)) validFilesBySize.push(file)
            else toast.error(`${file.name} has an invalid type!`)
        }

        const filesWithIds = validFilesBySize.map(fileAppendId)
        if (filesWithIds.length)
            setSelectedFiles(prev =>
                multiple
                    ? getUniqueFilesByName([...prev, ...filesWithIds]).slice(
                          0,
                          limit,
                      )
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
        upload: { totalProgress, filesProgressMap, proceedUpload, isUploading },
        props: {
            mini,
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
