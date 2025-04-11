import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    TbCameraRotate,
    TbCapture,
    TbLoader,
    TbPlus,
    TbTrash,
} from 'react-icons/tb/index.js'
import { toast } from 'react-toastify'
import truncate from 'truncate'
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

const toastClassName =
    'upup-px-4 upup-pr-6 upup-py-3 upup-text-center !upup-mb-0 upup-min-h-fit upup-shadow-lg [&_button]:upup-top-1/2 [&_button]:-upup-translate-y-1/2'

export default function useRootProvider({
    accept = '*',
    mini = false,
    dark = false,
    limit: propLimit = 1,
    isProcessing = false,
    allowPreview = true,
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
    onDoneClicked = () => {},
    onPrepareFiles,
    provider,
    tokenEndpoint,
    driveConfigs,
    customProps,
    enableAutoCorsConfig = false,
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
    const [uploadError, setUploadError] = useState('')

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
            else
                toast.error(truncate(message, 75), {
                    containerId: toastContainerId,
                    className: cn(toastClassName, 'upup-text-red-500'),
                })
        },
        [errorHandler, toastContainerId],
    )

    const onWarn = useCallback(
        (message: string) =>
            warningHandler
                ? warningHandler(message)
                : toast.warn(message, {
                      containerId: toastContainerId,
                      className: cn(toastClassName, 'upup-text-yellow-500'),
                  }),
        [warningHandler, toastContainerId],
    )
    function isFileWithParamsArray(
        files: File[] | FileWithParams[],
    ): files is FileWithParams[] {
        return files.length > 0 && 'id' in files[0]
    }
    async function dynamicUpload(files: File[] | FileWithParams[]) {
        dynamicallyReplaceFiles(files)
        return await proceedUpload()
    }
    function dynamicallyReplaceFiles(files: File[] | FileWithParams[]) {
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
        const newFilesMap = new Map(selectedFilesMap)
        const newFilesMapArray = Array.from(newFilesMap.values())
        const newFilesWithParams: FileWithParams[] = []
        for (const file of newFiles) {
            // Check if files length has surpassed the limit
            if (newFilesMap.size >= limit) {
                onWarn('Allowed limit has been surpassed!')
                break
            }
            const fileWithParams = fileAppendParams(file)
            newFilesWithParams.push(fileWithParams)
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
            else {
                newFilesMap.set(fileWithParams.id, fileWithParams)
                setSelectedFilesMap(newFilesMap)
            }
        }
        setIsAddingMore(false)
        onFilesSelected(newFilesWithParams)
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
        setUploadError('')

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
                customProps,
                enableAutoCorsConfig,
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
            const finalFiles = uploadResults.map(result => result.file)
            onFilesUploadComplete(finalFiles)

            setUploadStatus(UploadStatus.SUCCESSFUL)
            return uploadResults.map(result => result.key)
        } catch (error) {
            onError((error as Error).message)
            setUploadStatus(UploadStatus.FAILED)

            // Reset progress map
            setFilesProgressMap({})
            return
        }
    }
    const handleDone = useCallback(() => {
        onDoneClicked()
        handleCancel()
    }, [])

    const handleCancel = useCallback(() => {
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
        dynamicUpload,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
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
            uploadError,
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
            isProcessing,
            allowPreview,
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
