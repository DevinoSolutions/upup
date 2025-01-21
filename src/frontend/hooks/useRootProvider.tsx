import React, { useEffect, useRef, useState } from 'react'
import checkFileType from '../../shared/lib/checkFileType'
import {
    FileProgressObject,
    UploadAdapter,
    UpupUploaderProps,
} from '../../shared/types'
import { FileUploadState, IRootContext } from '../context/RootContext'
import {
    checkFileSize,
    compressFile,
    fileAppendId,
    getUniqueFilesByName,
    sizeToBytes,
} from '../lib/file'
import { ProviderSDK, UploadState } from '../lib/storage/provider'

interface FileWithId extends File {
    id?: string
}

const compressFiles = async (files: File[]) =>
    Promise.all(
        files.map(async file => {
            const compressed = await compressFile(file)
            return compressed
        }),
    )

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
}: UpupUploaderProps): IRootContext {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isAddingMore, setIsAddingMore] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [activeAdapter, setActiveAdapter] = useState<UploadAdapter>()
    const limit = mini ? 1 : propLimit
    const multiple = mini ? false : limit > 1
    const [filesStates, setFilesStates] = useState<
        Record<string, FileUploadState>
    >({})
    const sdkRef = useRef<ProviderSDK>()

    const handleSetSelectedFiles = (newFiles: File[], reset = false) => {
        onFilesSelected(newFiles)
        if (reset) return setSelectedFiles([])

        const validFilesByType = newFiles.filter(file =>
            checkFileType(accept, file, onFileTypeMismatch),
        )
        const validFilesBySize = validFilesByType.filter(file =>
            checkFileSize(file, maxFileSize),
        )

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

    const updateFileState = (
        fileName: string,
        update: Partial<FileUploadState>,
    ) =>
        setFilesStates(prev => ({
            ...prev,
            [fileName]: {
                ...prev[fileName],
                ...update,
            },
        }))

    const updateAllFilesState = (update: Partial<FileUploadState>) => {
        const newFilesStates = { ...filesStates }
        for (let key in newFilesStates)
            newFilesStates[key] = { ...newFilesStates[key], ...update }

        setFilesStates(newFilesStates)
    }

    const handleUploadProgress = (file: File, progress: FileProgressObject) => {
        updateFileState(file.name, {
            progress: progress.loaded,
        })
        onFileUploadProgress(file, progress)
    }

    const startAllUploads = async () => {
        if (!selectedFiles.length || !sdkRef.current) return

        const compressedFiles = shouldCompress
            ? await compressFiles(selectedFiles)
            : selectedFiles

        const preparedFiles = onPrepareFiles
            ? await onPrepareFiles(compressedFiles)
            : compressedFiles

        const results = await sdkRef.current.uploadAll(preparedFiles, {
            onFileUploadStart: file => {
                updateFileState(file.name, {
                    status: UploadState.UPLOADING,
                    progress: 0,
                })
                onFileUploadStart(file)
            },
            onFileUploadProgress: handleUploadProgress,
            onFileUploadComplete: (file, fileData) => {
                updateFileState(file.name, {
                    status: UploadState.COMPLETED,
                    progress: 100,
                })
                onFileUploadComplete(file, fileData)
            },
            onError: (error: string, file?: File) => {
                onError(error)
                updateFileState(file!.name, {
                    error: error,
                    status: UploadState.FAILED,
                })
            },
            onFilesUploadProgress: (completedFiles: number) =>
                onFilesUploadProgress(completedFiles, preparedFiles.length),
        })

        onFilesUploadComplete(results)
    }

    const pauseUpload = (fileName: string) => {
        if (!sdkRef.current) return
        sdkRef.current.pauseUpload(fileName)
        updateFileState(fileName, { status: UploadState.PAUSED })
    }

    const pauseAllUploads = () => {
        if (!sdkRef.current) return
        sdkRef.current.pauseAllUploads()
        updateAllFilesState({ status: UploadState.PAUSED })
    }

    const resumeUpload = async (file: File) => {
        if (!sdkRef.current) return
        updateFileState(file.name, { status: UploadState.UPLOADING })
        await sdkRef.current.resumeUpload(file)
    }

    const resumeAllUploads = async () => {
        if (!sdkRef.current) return
        updateAllFilesState({ status: UploadState.UPLOADING })
        await sdkRef.current.resumeAllUploads()
    }

    const retryFailedUpload = async (file: File) => {
        if (!sdkRef.current) return
        updateFileState(file.name, {
            status: UploadState.UPLOADING,
            error: undefined,
            retryCount: (filesStates[file.name]?.retryCount || 0) + 1,
        })
        await sdkRef.current.retryFailedUpload(file)
    }

    const retryAllFailedUploads = async () => {
        if (!sdkRef.current) return

        const newFilesStates = { ...filesStates }
        for (let key in newFilesStates)
            newFilesStates[key] = {
                ...newFilesStates[key],
                status: UploadState.UPLOADING,
                error: undefined,
                retryCount: (newFilesStates[key]?.retryCount || 0) + 1,
            }
        setFilesStates(newFilesStates)

        await sdkRef.current.retryAllFailedUploads()
    }

    const handleReset = () => {
        setSelectedFiles([])
        setFilesStates({})
    }

    useEffect(() => {
        sdkRef.current = new ProviderSDK({
            provider,
            tokenEndpoint,
            constraints: {
                multiple,
                accept,
                maxFileSize: sizeToBytes(maxFileSize.size, maxFileSize.unit),
            },
        })

        return () => {
            sdkRef.current?.dispose()
        }
    }, [provider, tokenEndpoint])

    return {
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        files: selectedFiles,
        setFiles: handleSetSelectedFiles,
        handleFileRemove,
        handleReset,
        oneDriveConfigs: driveConfigs?.oneDrive,
        googleDriveConfigs: driveConfigs?.googleDrive,
        upload: {
            filesStates,
            startAllUploads,
            pauseUpload,
            pauseAllUploads,
            resumeUpload,
            resumeAllUploads,
            retryFailedUpload,
            retryAllFailedUploads,
        },
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
