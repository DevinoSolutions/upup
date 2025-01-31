import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    TbCameraRotate,
    TbCapture,
    TbLoader,
    TbPlus,
    TbTrash,
} from 'react-icons/tb'
import { toast } from 'react-toastify'
import { v4 as uuid } from 'uuid'
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
    sizeToBytes,
} from '../lib/file'
import { ProviderSDK } from '../lib/storage/provider'
import { cn } from '../lib/tailwind'

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
    onPrepareFiles,
    provider,
    tokenEndpoint,
    driveConfigs,
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
    const [toastContainerId, setToastContainerId] = useState<string>()

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
    const toastClassName = useMemo(
        () =>
            cn(
                'px-4 py-3 w-[200px] text-center mb-0 min-h-fit shadow-lg [&_button]:top-1/2 [&_button]:-translate-y-1/2',
                {
                    '@cs/main:w-[400px]': !mini,
                },
            ),
        [mini],
    )

    const onError = useCallback(
        (message: string) =>
            errorHandler
                ? errorHandler(message)
                : toast.error(message, {
                      containerId: toastContainerId,
                      className: cn(toastClassName, 'text-red-500'),
                  }),
        [errorHandler, toastClassName, toastContainerId],
    )

    const onWarn = useCallback(
        (message: string) =>
            warningHandler
                ? warningHandler(message)
                : toast.warn(message, {
                      containerId: toastContainerId,
                      className: cn(toastClassName, 'text-yellow-500'),
                  }),
        [warningHandler, toastContainerId, toastClassName],
    )

    const handleSetSelectedFiles = (newFiles: File[]) => {
        onFilesSelected(newFiles)

        const newFilesMap = new Map(selectedFilesMap)
        const newFilesMapArray = Array.from(newFilesMap.values())
        for (const file of newFiles) {
            const i = newFiles.indexOf(file)

            // Check if files length has surpassed the limit
            if (selectedFilesMap.size + i >= limit) {
                onWarn('Allowed limit has been surpassed!')
                break
            }
            const fileWithParams = fileAppendParams(file)

            if (!checkFileType(accept, file)) {
                onError(`${file.name} has an unsupported type!`)
                onFileTypeMismatch(file, accept)
            } else if (!checkFileSize(file, maxFileSize))
                onError(
                    `${file.name} is larger than ${maxFileSize.size} ${maxFileSize.unit}!`,
                )
            else if (newFilesMap.has(fileWithParams.id))
                onWarn(`${file.name} has previously been selected`)
            else if (
                newFilesMapArray.find(item => (file as any).url === item.url)
            )
                onWarn(
                    `A file with this url: ${
                        (file as any).url
                    } has previously been selected`,
                )
            else newFilesMap.set(fileWithParams.id, fileWithParams)
        }

        setSelectedFilesMap(newFilesMap)
        setIsAddingMore(false)
    }

    const handleFileRemove = useCallback(
        (fileId: string) => {
            const selectedFilesMapCopy = new Map(selectedFilesMap)
            selectedFilesMapCopy.delete(fileId)

            setSelectedFilesMap(selectedFilesMapCopy)

            const file = selectedFilesMap.get(fileId)!
            onFileRemove(file)
        },
        [onFileRemove, selectedFilesMap],
    )

    const compressFiles = useCallback(
        async (files: FileWithParams[]) => {
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
        },
        [onError],
    )

    const handlePrepareFiles = useCallback(
        async (files: FileWithParams[]) => {
            const progressMap = files.reduce((a, b) => {
                a[b.id] = {
                    id: b.id,
                    loaded: 0,
                    total: b.size,
                }

                return a
            }, {} as FilesProgressMap)
            setFilesProgressMap(progressMap)

            return onPrepareFiles ? await onPrepareFiles(files) : files
        },
        [onPrepareFiles],
    )

    const proceedUpload = async () => {
        if (!selectedFilesMap.size) return
        setUploadStatus(UploadStatus.ONGOING)
        const selectedFiles = Array.from(selectedFilesMap.values())

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
                                [file.id]: {
                                    ...prev[file.id],
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

            // Reset progress map
            setFilesProgressMap({})
            return
        }
    }

    const handleDone = useCallback(() => {
        setUploadStatus(UploadStatus.PENDING)
        setSelectedFilesMap(new Map())
        setFilesProgressMap({})
    }, [])

    useEffect(() => {
        if (!toastContainerId && (!errorHandler || !warningHandler))
            setToastContainerId(uuid())
    }, [errorHandler, warningHandler, toastContainerId])

    return {
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        files: selectedFilesMap,
        setFiles: handleSetSelectedFiles,
        handleDone,
        handleFileRemove,
        oneDriveConfigs: driveConfigs?.oneDrive,
        googleDriveConfigs: driveConfigs?.googleDrive,
        toastContainerId,
        upload: {
            totalProgress,
            filesProgressMap,
            proceedUpload,
            uploadStatus,
            setUploadStatus,
        },
        props: {
            mini,
            dark,
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
