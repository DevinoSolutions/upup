import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    TbCameraRotate,
    TbCapture,
    TbLoader,
    TbPlus,
    TbTrash,
} from 'react-icons/tb/index.js'
import checkFileType from '../../shared/lib/checkFileType'
import {
    FileWithParams,
    UploadAdapter,
    UpupUploaderProps,
} from '../../shared/types'
import { IRootContext, UploadStatus } from '../context/RootContext'
import {
    checkFileSize,
    compressFile,
    fileAppendParams,
    revokeFileUrl,
    sizeToBytes,
} from '../lib/file'
import {
    fileFingerprint,
    loadSession,
} from '../lib/resumable/multipartSessionStore'
import { ProviderSDK } from '../lib/storage/provider'
import { UploadResult } from '../types/StorageSDK'

type FileProgress = {
    id: string
    loaded: number
    total: number
}

export type FilesProgressMap = Record<string, FileProgress>

async function uploadWithRetry(
    fn: () => Promise<UploadResult>,
    maxRetries: number,
): Promise<UploadResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            if (attempt === maxRetries) throw error
        }
    }
    throw new Error('Upload failed after retries')
}

export default function useRootProvider({
    accept = '*',
    mini = false,
    dark = false,
    limit: propLimit = 1,
    isProcessing = false,
    allowPreview = true,
    showSelectFolderButton = false,
    maxFileSize,
    shouldCompress = false,
    uploadAdapters = [UploadAdapter.INTERNAL, UploadAdapter.LINK],
    onError: errorHandler,
    onWarn: warningHandler,
    icons = {},
    classNames = {},
    onIntegrationClick = () => {},
    onFileClick = () => {},
    onFileRemove = () => {},
    onFilesDragOver = () => {},
    onFilesDragLeave = () => {},
    onFilesDrop = () => {},
    onFileTypeMismatch = () => {},
    onFileUploadStart = () => {},
    onFileUploadProgress = () => {},
    onFilesUploadProgress = () => {},
    onFileUploadComplete = () => {},
    onFilesUploadComplete = () => {},
    onFilesSelected = () => {},
    onDoneClicked = () => {},
    onPrepareFiles,
    provider,
    tokenEndpoint,
    driveConfigs,
    customProps,
    enableAutoCorsConfig = false,
    maxRetries,
    resumable,
}: UpupUploaderProps): IRootContext {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isAddingMore, setIsAddingMore] = useState(false)
    const [selectedFilesMap, setSelectedFilesMap] = useState<
        Map<string, FileWithParams>
    >(new Map())
    const [activeAdapter, setActiveAdapter] = useState<UploadAdapter>()
    const [uploadStatus, setUploadStatus] = useState(UploadStatus.PENDING)
    const [filesProgressMap, setFilesProgressMap] = useState<FilesProgressMap>(
        {} as FilesProgressMap,
    )
    const [uploadError, setUploadError] = useState('')
    const [uploadSpeed, setUploadSpeed] = useState(0)
    const [uploadEta, setUploadEta] = useState(0)
    const [uploadedBytes, setUploadedBytes] = useState(0)
    const [totalBytes, setTotalBytes] = useState(0)

    // SDK ref for pause/resume control
    const sdkRef = useRef<ProviderSDK | null>(null)
    // Speed tracking refs
    const speedSamplesRef = useRef<{ time: number; bytes: number }[]>([])
    // Ref for totalBytes so progress callback always has the latest value
    const totalBytesRef = useRef(0)

    // Keep a ref to selectedFilesMap for unmount cleanup
    const selectedFilesMapRef = useRef(selectedFilesMap)
    useEffect(() => {
        selectedFilesMapRef.current = selectedFilesMap
    }, [selectedFilesMap])

    // Revoke all blob URLs on unmount to prevent memory leaks in SPAs
    useEffect(() => {
        return () => {
            selectedFilesMapRef.current.forEach(file => revokeFileUrl(file))
        }
    }, [])

    const limit = useMemo(
        () => (mini ? 1 : Math.max(propLimit, 1)),
        [mini, propLimit],
    )
    const multiple = useMemo(() => (mini ? false : limit > 1), [limit, mini])
    const totalProgress = useMemo(() => {
        const filesProgressMapValues = Object.values(filesProgressMap)
        if (!filesProgressMapValues.length) return 0

        const loadedValues = filesProgressMapValues.reduce(
            (a, b) => a + (b.loaded / b.total) * 100,
            0,
        )
        return Math.round(loadedValues / filesProgressMapValues.length)
    }, [filesProgressMap])

    const onError = useCallback(
        (message: string) => {
            setUploadError(message)

            if (errorHandler) errorHandler(message)
        },
        [errorHandler],
    )

    const onWarn = useCallback(
        (message: string) => {
            if (warningHandler) warningHandler(message)
        },
        [warningHandler],
    )
    function isFileWithParamsArray(
        files: File[] | FileWithParams[],
    ): files is FileWithParams[] {
        return files.length > 0 && 'id' in files[0]
    }
    async function resetState() {
        setIsAddingMore(false)
        handleDone()
    }
    async function dynamicUpload(files: File[] | FileWithParams[]) {
        const filesToUpload = isFileWithParamsArray(files)
            ? files
            : files.map(file => fileAppendParams(file))
        return await proceedUpload(filesToUpload)
    }
    function dynamicallyReplaceFiles(files: File[] | FileWithParams[]) {
        // Revoke old blob URLs to prevent memory leak
        selectedFilesMap.forEach(file => revokeFileUrl(file))

        const filesMap = new Map<string, FileWithParams>()
        if (isFileWithParamsArray(files)) {
            for (const f of files) {
                filesMap.set(f.id, f)
            }
        } else {
            for (const f of files) {
                const fileWithParams = fileAppendParams(f)
                filesMap.set(fileWithParams.id, fileWithParams)
            }
        }
        setSelectedFilesMap(filesMap)
    }
    const handleSetSelectedFiles = (newFiles: File[]) => {
        // Start from existing files to ensure appending behavior.
        const newFilesMap = new Map(selectedFilesMap)
        // Track existing URLs (when present) to avoid duplicates across drops.
        const existingUrls = new Set(
            Array.from(newFilesMap.values())
                .map(v => (v as any).url)
                .filter(Boolean),
        ) as Set<string>

        // Collect only the files that are actually accepted and added in this batch.
        const addedThisBatch: FileWithParams[] = []

        for (const file of newFiles) {
            // Respect the limit strictly; stop when capacity is reached.
            if (newFilesMap.size >= limit) {
                onWarn('Allowed limit has been surpassed!')
                break
            }

            const fileWithParams = fileAppendParams(file)

            if (!checkFileType(accept, file)) {
                onError(`${file.name} has an unsupported type!`)
                onFileTypeMismatch(file, accept)
                revokeFileUrl(fileWithParams)
                continue
            }

            if (
                maxFileSize?.size &&
                maxFileSize?.unit &&
                !checkFileSize(file, maxFileSize)
            ) {
                onError(
                    `${file.name} is larger than ${maxFileSize.size} ${maxFileSize.unit}!`,
                )
                revokeFileUrl(fileWithParams)
                continue
            }

            if (newFilesMap.has(fileWithParams.id)) {
                onWarn(`${file.name} has previously been selected`)
                revokeFileUrl(fileWithParams)
                continue
            }

            const fileUrl = (file as any).url as string | undefined
            if (fileUrl && existingUrls.has(fileUrl)) {
                onWarn(
                    `A file with this url: ${fileUrl} has previously been selected`,
                )
                revokeFileUrl(fileWithParams)
                continue
            }

            newFilesMap.set(fileWithParams.id, fileWithParams)
            addedThisBatch.push(fileWithParams)
            if (fileUrl) existingUrls.add(fileUrl)
        }

        // Apply state update once for better performance and atomicity.
        setSelectedFilesMap(newFilesMap)

        // Emit a single selection event for just-added files.
        if (addedThisBatch.length) onFilesSelected(addedThisBatch)

        setIsAddingMore(false)
    }

    const handleFileRemove = useCallback(
        (fileId: string) => {
            const file = selectedFilesMap.get(fileId)
            if (!file) return

            // Revoke blob URL to prevent memory leak
            revokeFileUrl(file)

            const selectedFilesMapCopy = new Map(selectedFilesMap)
            selectedFilesMapCopy.delete(fileId)

            setSelectedFilesMap(selectedFilesMapCopy)
            onFileRemove(file)
        },
        [onFileRemove, selectedFilesMap],
    )

    const compressFiles = useCallback(
        async (files: FileWithParams[]) => {
            try {
                return await Promise.all(
                    files.map(async oldFile => {
                        return await compressFile(oldFile)
                    }),
                )
            } catch (error) {
                files.forEach(file => onError(`Error compressing ${file.name}`))
                throw error
            }
        },
        [onError],
    )

    const handlePrepareFiles = useCallback(
        async (files: FileWithParams[]) => {
            // Pre-populate progress from existing multipart sessions
            const progressMap = files.reduce((a, b) => {
                let initialLoaded = 0
                if (resumable?.mode === 'multipart') {
                    const fp = fileFingerprint(b)
                    const session = loadSession(fp)
                    if (session?.uploadedBytes) {
                        initialLoaded = session.uploadedBytes
                    }
                }
                a[b.id] = {
                    id: b.id,
                    loaded: initialLoaded,
                    total: b.size,
                }
                return a
            }, {} as FilesProgressMap)
            setFilesProgressMap(progressMap)

            // Set total bytes for ETA calculation
            const total = files.reduce((sum, f) => sum + f.size, 0)
            setTotalBytes(total)
            totalBytesRef.current = total
            const initialUploaded = Object.values(progressMap).reduce(
                (sum: number, fp: FileProgress) => sum + fp.loaded,
                0,
            )
            setUploadedBytes(initialUploaded)
            setUploadSpeed(0)
            setUploadEta(0)
            speedSamplesRef.current = []

            return onPrepareFiles ? await onPrepareFiles(files) : files
        },
        [onPrepareFiles, resumable],
    )
    const proceedUpload = useCallback(
        async (dynamicFiles: FileWithParams[] | undefined = undefined) => {
            if (!selectedFilesMap.size && !dynamicFiles) return
            setUploadStatus(UploadStatus.ONGOING)
            setUploadError('')
            const sendEvent = !dynamicFiles
            const selectedFiles = dynamicFiles
                ? dynamicFiles
                : Array.from(selectedFilesMap.values())
            try {
                const compressedFiles = shouldCompress
                    ? await compressFiles(selectedFiles)
                    : selectedFiles
                const processedFiles = await handlePrepareFiles(compressedFiles)
                // Initialize SDK
                const sdk = new ProviderSDK({
                    provider,
                    tokenEndpoint,
                    constraints: {
                        multiple,
                        accept,
                        maxFileSize:
                            maxFileSize?.size && maxFileSize?.unit
                                ? sizeToBytes(
                                      maxFileSize.size,
                                      maxFileSize.unit,
                                  )
                                : undefined,
                    },
                    customProps,
                    enableAutoCorsConfig,
                    resumable,
                })

                // Store SDK ref for pause/resume
                sdkRef.current = sdk
                speedSamplesRef.current = [{ time: Date.now(), bytes: 0 }]

                // For multipart resumable uploads, filter out already-uploaded files on retry
                const filesToUpload =
                    resumable?.mode === 'multipart'
                        ? processedFiles.filter(f => !f.key)
                        : processedFiles

                // Upload files with automatic retries if configured
                const uploadOptions = {
                    onFileUploadStart,
                    onFileUploadProgress: (
                        file: FileWithParams,
                        progress: {
                            loaded: number
                            total: number
                            percentage: number
                        },
                    ) => {
                        // Skip visual updates while paused so the UI freezes immediately
                        if (sdkRef.current?.isPaused) return

                        setFilesProgressMap((prev: FilesProgressMap) => ({
                            ...prev,
                            [file.id]: {
                                ...prev[file.id],
                                loaded: progress.loaded,
                            },
                        }))

                        // Update aggregate uploaded bytes for speed/ETA
                        setFilesProgressMap((prev: FilesProgressMap) => {
                            const totalLoaded = Object.values(prev).reduce(
                                (sum: number, fp: FileProgress) =>
                                    sum + fp.loaded,
                                0,
                            )
                            setUploadedBytes(totalLoaded)

                            // Rolling-average speed calculation (last 3 seconds)
                            const now = Date.now()
                            speedSamplesRef.current.push({
                                time: now,
                                bytes: totalLoaded,
                            })
                            // Keep only samples from last 3 seconds
                            const cutoff = now - 3000
                            speedSamplesRef.current =
                                speedSamplesRef.current.filter(
                                    (s: { time: number; bytes: number }) =>
                                        s.time >= cutoff,
                                )

                            if (speedSamplesRef.current.length >= 2) {
                                const oldest = speedSamplesRef.current[0]
                                const newest =
                                    speedSamplesRef.current[
                                        speedSamplesRef.current.length - 1
                                    ]
                                const elapsed =
                                    (newest.time - oldest.time) / 1000
                                if (elapsed > 0) {
                                    const speed =
                                        (newest.bytes - oldest.bytes) / elapsed
                                    setUploadSpeed(Math.max(0, speed))

                                    const remaining =
                                        totalBytesRef.current - totalLoaded
                                    if (speed > 0) {
                                        setUploadEta(
                                            Math.ceil(remaining / speed),
                                        )
                                    }
                                }
                            }

                            return prev
                        })

                        onFileUploadProgress(file, progress)
                    },
                    onFileUploadComplete,
                    sendEvent,
                    onError,
                    onFilesUploadProgress: (completedFiles: number) =>
                        onFilesUploadProgress(
                            completedFiles,
                            processedFiles.length,
                        ),
                }
                const uploadResults = await Promise.all(
                    filesToUpload.map(file =>
                        maxRetries
                            ? uploadWithRetry(
                                  () => sdk.upload(file, uploadOptions),
                                  maxRetries,
                              )
                            : sdk.upload(file, uploadOptions),
                    ),
                )
                const finalFiles = uploadResults.map(result => result.file)
                if (sendEvent) onFilesUploadComplete(finalFiles)

                sdkRef.current = null
                setUploadStatus(UploadStatus.SUCCESSFUL)
                return finalFiles
            } catch (error) {
                onError((error as Error).message)
                sdkRef.current = null
                setUploadStatus(UploadStatus.FAILED)
                // Preserve filesProgressMap so progress stays visible alongside the Retry button
                return
            }
        },
        [
            selectedFilesMap,
            shouldCompress,
            compressFiles,
            handlePrepareFiles,
            provider,
            tokenEndpoint,
            multiple,
            accept,
            maxFileSize?.size,
            maxFileSize?.unit,
            customProps,
            enableAutoCorsConfig,
            resumable,
            onFilesUploadComplete,
            onFileUploadStart,
            onFileUploadComplete,
            onError,
            onFileUploadProgress,
            onFilesUploadProgress,
            maxRetries,
        ],
    )
    const handleCancel = useCallback(() => {
        // Abort in-flight upload
        sdkRef.current?.abort()

        // Best-effort abort multipart uploads on the provider to avoid orphaned uploads
        if (sdkRef.current && resumable?.mode === 'multipart') {
            selectedFilesMap.forEach(file => {
                void sdkRef.current?.abortMultipart(file)
            })
        }

        sdkRef.current = null

        // Revoke all blob URLs to prevent memory leak
        selectedFilesMap.forEach(file => revokeFileUrl(file))

        setUploadStatus(UploadStatus.PENDING)
        setSelectedFilesMap(new Map())
        setFilesProgressMap({})
        setUploadSpeed(0)
        setUploadEta(0)
        setUploadedBytes(0)
        setTotalBytes(0)
    }, [resumable?.mode, selectedFilesMap])

    const handlePause = useCallback(() => {
        sdkRef.current?.pause()
        setUploadStatus(UploadStatus.PAUSED)
    }, [])

    const handleResume = useCallback(() => {
        sdkRef.current?.resume()
        // Reset speed tracking on resume for accurate ETA
        speedSamplesRef.current = [{ time: Date.now(), bytes: uploadedBytes }]
        setUploadStatus(UploadStatus.ONGOING)
    }, [uploadedBytes])

    const handleDone = useCallback(() => {
        onDoneClicked()
        handleCancel()
    }, [handleCancel, onDoneClicked])

    return {
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        files: selectedFilesMap,
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        oneDriveConfigs: driveConfigs?.oneDrive,
        googleDriveConfigs: driveConfigs?.googleDrive,
        dropboxConfigs: driveConfigs?.dropbox,
        upload: {
            totalProgress,
            filesProgressMap,
            proceedUpload,
            uploadStatus,
            setUploadStatus,
            uploadError,
            uploadSpeed,
            uploadEta,
            uploadedBytes,
            totalBytes,
        },
        props: {
            mini,
            dark,
            maxRetries,
            resumable,
            onError,
            onIntegrationClick,
            onFileClick,
            onFilesDragOver,
            onFilesDragLeave,
            onFilesDrop,
            uploadAdapters,
            accept,
            maxFileSize,
            limit,
            isProcessing,
            allowPreview,
            showSelectFolderButton,
            multiple,
            icons: {
                ContainerAddMoreIcon: icons.ContainerAddMoreIcon || TbPlus,
                FileDeleteIcon: icons.FileDeleteIcon || TbTrash,
                CameraCaptureIcon: icons.CameraCaptureIcon || TbCapture,
                CameraRotateIcon: icons.CameraRotateIcon || TbCameraRotate,
                CameraDeleteIcon: icons.CameraDeleteIcon || TbTrash,
                LoaderIcon: icons.LoaderIcon || TbLoader,
            },
            classNames,
        },
    }
}
