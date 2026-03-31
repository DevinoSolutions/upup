import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    TbCameraRotate,
    TbCapture,
    TbFlipHorizontal,
    TbLoader,
    TbMicrophone,
    TbPlayerStop,
    TbPlus,
    TbScreenShare,
    TbTrash,
    TbVideo,
} from 'react-icons/tb'
import { en_US, mergeTranslations, t } from '../../shared/i18n'
import checkFileType from '../../shared/lib/checkFileType'
import {
    FileWithParams,
    ImageCompressionOptions,
    ResolvedImageEditorOptions,
    ThumbnailGeneratorOptions,
    UploadAdapter,
    UpupUploaderProps,
} from '../../shared/types'
import { IRootContext, UploadStatus } from '../context/RootContext'
import {
    checkFileSize,
    checkMinFileSize,
    compressFile,
    compressImageFile,
    computeFileHash,
    computeFullContentHash,
    convertHeicFile,
    fileAppendParams,
    generateThumbnailForFile,
    revokeFileUrl,
    sizeToBytes,
    stripExifData,
} from '../lib/file'
import {
    copyPreservedFileMetadata,
    reorderFilesMap,
    selectionContainsFolders,
    sortFilesForSelection,
} from '../lib/fileOrder'
import {
    blobToFileWithParams,
    dataURLtoBlob,
    revokeAndReplace,
} from '../lib/imageEditorHelpers'
import {
    fileFingerprint,
    loadSession,
} from '../lib/resumable/multipartSessionStore'
import { ProviderSDK } from '../lib/storage/provider'
import { UploadResult } from '../types/StorageSDK'
import { useCrashRecovery } from './useCrashRecovery'
import useInformer from './useInformer'

type FileProgress = {
    id: string
    loaded: number
    total: number
}

export type FilesProgressMap = Record<string, FileProgress>

async function uploadWithRetry(
    fn: () => Promise<UploadResult>,
    maxRetries: number,
    onRetryAttempt?: (attempt: number, maxRetries: number) => void,
): Promise<UploadResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            if (attempt === maxRetries) throw error
            onRetryAttempt?.(attempt, maxRetries)
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
    minFileSize,
    minFiles,
    maxTotalFileSize,
    shouldCompress = false,
    imageCompression,
    thumbnailGenerator,
    uploadAdapters = [UploadAdapter.INTERNAL, UploadAdapter.LINK],
    onError: errorHandler,
    onWarn: warningHandler,
    icons = {},
    classNames = {},
    localePack,
    translations: translationOverrides,
    onIntegrationClick = () => {},
    onFileClick = () => {},
    onFileRemove = () => {},
    onFilesDragOver = () => {},
    onFilesDragLeave = () => {},
    onFilesDrop = () => {},
    onFileTypeMismatch = () => {},
    onRestrictionFailed,
    onRetry,
    imageEditor: imageEditorProp,
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
    maxConcurrentUploads,
    autoUpload = false,
    resumable,
    crashRecovery,
    note,
    showRemoveButtonAfterComplete = true,
    hideUploadButton = false,
    disableLocalFiles = false,
    onBeforeFileAdded,
    disabled = false,
    reducedMotion = 'user',
    contentDeduplication = false,
    stripExifData: stripExifDataProp = false,
    heicConversion: heicConversionProp = false,
    checksumVerification: checksumVerificationProp = false,
    hideCancelButton = false,
    hidePauseResumeButton = false,
    hideProgressAfterFinish = false,
    hideRetryButton = false,
    disableInformer = false,
    showSelectedFiles = true,
    allowMultipleUploadBatches = true,
    infoTimeout,
    meta,
    width,
    height,
    autoOpen,
    onBeforeUpload,
}: UpupUploaderProps): IRootContext {
    const informer = useInformer(infoTimeout)
    const inputRef = useRef<HTMLInputElement>(null)
    const {
        persistFiles,
        restoreFiles,
        clearPersistedFiles,
        enabled: crashRecoveryEnabled,
    } = useCrashRecovery(crashRecovery)
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
    const [editingFile, setEditingFile] = useState<FileWithParams | null>(null)
    const [editorQueue, setEditorQueue] = useState<FileWithParams[]>([])

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

    // Crash recovery: restore persisted files on mount
    useEffect(() => {
        if (!crashRecoveryEnabled) return
        restoreFiles().then(restoredMap => {
            if (restoredMap && restoredMap.size > 0) {
                setSelectedFilesMap(restoredMap)
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const limit = useMemo(
        () => (mini ? 1 : Math.max(propLimit, 1)),
        [mini, propLimit],
    )
    const multiple = useMemo(() => (mini ? false : limit > 1), [limit, mini])

    const translations = useMemo(
        () => mergeTranslations(localePack ?? en_US, translationOverrides),
        [localePack, translationOverrides],
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

    const resolvedImageEditor = useMemo<ResolvedImageEditorOptions>(() => {
        if (imageEditorProp === true) {
            return { enabled: true, autoOpen: 'never', display: 'inline' }
        }
        if (typeof imageEditorProp === 'object' && imageEditorProp !== null) {
            return {
                ...imageEditorProp,
                enabled: imageEditorProp.enabled ?? false,
                autoOpen: imageEditorProp.autoOpen ?? 'never',
                display: imageEditorProp.display ?? 'inline',
            }
        }
        return { enabled: false, autoOpen: 'never', display: 'inline' }
    }, [imageEditorProp])

    const openImageEditor = useCallback(
        (file: FileWithParams) => {
            setEditingFile(file)
            resolvedImageEditor.onOpen?.(file)
        },
        [resolvedImageEditor],
    )

    const advanceEditorQueue = useCallback(() => {
        setEditorQueue(prev => {
            if (prev.length === 0) return prev
            const [next, ...rest] = prev
            setTimeout(() => openImageEditor(next), 0)
            return rest
        })
    }, [openImageEditor])

    const closeImageEditor = useCallback(() => {
        const current = editingFile
        setEditingFile(null)
        advanceEditorQueue()
        if (current) resolvedImageEditor.onCancel?.(current)
    }, [editingFile, advanceEditorQueue, resolvedImageEditor])

    const saveImageEdit = useCallback(
        (editedImageData: string, mimeType?: string) => {
            if (!editingFile) return

            const original = editingFile
            const outputMime =
                mimeType ||
                resolvedImageEditor.output?.mimeType ||
                original.type
            const quality = resolvedImageEditor.output?.quality

            // Convert the base64 / dataURL to a Blob.
            // If a quality or mimeType override is specified and the data is a
            // plain dataURL, we re-encode via canvas; otherwise use as-is.
            let blob: Blob
            if (
                (quality !== undefined || outputMime !== original.type) &&
                editedImageData.startsWith('data:')
            ) {
                // Fast path: just decode the dataURL directly with the given mime.
                const raw = dataURLtoBlob(editedImageData)
                blob = new Blob([raw], { type: outputMime })
            } else {
                blob = dataURLtoBlob(editedImageData)
            }

            const newFile = blobToFileWithParams(
                blob,
                original,
                resolvedImageEditor.output,
            )

            // Replace in the files map, revoking the old blob URL.
            setSelectedFilesMap(prev =>
                revokeAndReplace(prev, original.id, newFile),
            )

            resolvedImageEditor.onSave?.(newFile, original)

            setEditingFile(null)
            advanceEditorQueue()
        },
        [editingFile, resolvedImageEditor, advanceEditorQueue],
    )

    const replaceFile = useCallback(
        (fileId: string, newFile: FileWithParams) => {
            setSelectedFilesMap(prev => {
                const next = new Map(prev)
                next.set(fileId, newFile)
                return next
            })
        },
        [],
    )

    // Auto-open editor queue processing: when a queue is populated and no
    // editor is currently open, open the next file.
    useEffect(() => {
        if (editingFile || editorQueue.length === 0) return
        const [next, ...rest] = editorQueue
        setEditorQueue(rest)
        openImageEditor(next)
    }, [editingFile, editorQueue, openImageEditor])

    const onError = useCallback(
        (message: string) => {
            setUploadError(message)
            informer.addMessage(message, 'error')
            errorHandler?.(message)
        },
        [informer, errorHandler],
    )

    const onWarn = useCallback(
        (message: string) => {
            informer.addMessage(message, 'warning')
            warningHandler?.(message)
        },
        [informer, warningHandler],
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
            ? sortFilesForSelection(files)
            : sortFilesForSelection(files).map(file => fileAppendParams(file))
        return await proceedUpload(filesToUpload)
    }
    function dynamicallyReplaceFiles(files: File[] | FileWithParams[]) {
        // Revoke old blob URLs to prevent memory leak
        selectedFilesMap.forEach(file => revokeFileUrl(file))

        const filesMap = new Map<string, FileWithParams>()
        if (isFileWithParamsArray(files)) {
            for (const f of sortFilesForSelection(files)) {
                filesMap.set(f.id, f)
            }
        } else {
            for (const f of sortFilesForSelection(files)) {
                const fileWithParams = fileAppendParams(f)
                filesMap.set(fileWithParams.id, fileWithParams)
            }
        }
        setSelectedFilesMap(filesMap)
        if (crashRecoveryEnabled) void persistFiles(filesMap)
    }
    const handleSetSelectedFiles = async (newFiles: File[]) => {
        const orderedNewFiles = sortFilesForSelection(newFiles)
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

        for (let file of orderedNewFiles) {
            // Respect the limit strictly; stop when capacity is reached.
            if (newFilesMap.size >= limit) {
                const msg = translations.allowedLimitSurpassed
                onWarn(msg)
                onRestrictionFailed?.(file, {
                    reason: 'LIMIT_EXCEEDED',
                    message: msg,
                })
                break
            }

            // Allow the consumer to reject or transform the file before adding.
            if (onBeforeFileAdded) {
                const result = onBeforeFileAdded(file)
                if (result === false) {
                    onRestrictionFailed?.(file, {
                        reason: 'BEFORE_FILE_ADDED_REJECTED',
                        message: 'File rejected by onBeforeFileAdded',
                    })
                    continue
                }
                if (result instanceof File) file = result
            }

            const fileWithParams = fileAppendParams(file)

            if (!checkFileType(accept, file)) {
                const msg = t(translations.fileUnsupportedType, {
                    name: file.name,
                })
                onError(msg)
                onFileTypeMismatch(file, accept)
                onRestrictionFailed?.(file, {
                    reason: 'TYPE_MISMATCH',
                    message: msg,
                })
                revokeFileUrl(fileWithParams)
                continue
            }

            if (
                maxFileSize?.size &&
                maxFileSize?.unit &&
                !checkFileSize(file, maxFileSize)
            ) {
                const msg = t(translations.fileTooLargeName, {
                    name: file.name,
                    size: String(maxFileSize.size),
                    unit: String(maxFileSize.unit),
                })
                onError(msg)
                onRestrictionFailed?.(file, {
                    reason: 'FILE_TOO_LARGE',
                    message: msg,
                })
                revokeFileUrl(fileWithParams)
                continue
            }

            if (
                minFileSize?.size &&
                minFileSize?.unit &&
                !checkMinFileSize(file, minFileSize)
            ) {
                const msg = t(translations.fileTooSmallName, {
                    name: file.name,
                    size: String(minFileSize.size),
                    unit: String(minFileSize.unit),
                })
                onError(msg)
                onRestrictionFailed?.(file, {
                    reason: 'FILE_TOO_SMALL',
                    message: msg,
                })
                revokeFileUrl(fileWithParams)
                continue
            }

            if (newFilesMap.has(fileWithParams.id)) {
                const msg = t(translations.filePreviouslySelected, {
                    name: file.name,
                })
                onWarn(msg)
                onRestrictionFailed?.(file, {
                    reason: 'DUPLICATE',
                    message: msg,
                })
                revokeFileUrl(fileWithParams)
                continue
            }

            // Content-based deduplication via SHA-256 hash
            if (contentDeduplication) {
                const hash = await computeFileHash(file)
                fileWithParams.fileHash = hash
                const isDuplicateContent = Array.from(
                    newFilesMap.values(),
                ).some(existing => existing.fileHash === hash)
                if (isDuplicateContent) {
                    const msg = t(translations.filePreviouslySelected, {
                        name: file.name,
                    })
                    onWarn(msg)
                    onRestrictionFailed?.(file, {
                        reason: 'DUPLICATE',
                        message: msg,
                    })
                    revokeFileUrl(fileWithParams)
                    continue
                }
            }

            const fileUrl = (file as any).url as string | undefined
            if (fileUrl && existingUrls.has(fileUrl)) {
                const msg = t(translations.fileWithUrlPreviouslySelected, {
                    url: fileUrl,
                })
                onWarn(msg)
                onRestrictionFailed?.(file, {
                    reason: 'DUPLICATE',
                    message: msg,
                })
                revokeFileUrl(fileWithParams)
                continue
            }

            newFilesMap.set(fileWithParams.id, fileWithParams)
            addedThisBatch.push(fileWithParams)
            if (fileUrl) existingUrls.add(fileUrl)
        }

        // Enforce max total file size across all selected files
        if (maxTotalFileSize?.size && maxTotalFileSize?.unit) {
            const maxTotalBytes = sizeToBytes(
                maxTotalFileSize.size,
                maxTotalFileSize.unit,
            )
            const totalBytes = Array.from(newFilesMap.values()).reduce(
                (sum, f) => sum + f.size,
                0,
            )
            if (totalBytes > maxTotalBytes) {
                const msg = t(translations.totalFileSizeExceeded, {
                    size: maxTotalFileSize.size,
                    unit: maxTotalFileSize.unit,
                })
                onError(msg)
                // Revert: remove files added this batch that pushed over limit
                for (const f of addedThisBatch) {
                    onRestrictionFailed?.(f, {
                        reason: 'TOTAL_SIZE_EXCEEDED',
                        message: msg,
                    })
                    newFilesMap.delete(f.id)
                }
                setSelectedFilesMap(newFilesMap)
                return
            }
        }

        // Apply state update once for better performance and atomicity.
        setSelectedFilesMap(newFilesMap)
        if (crashRecoveryEnabled) void persistFiles(newFilesMap)

        // Emit a single selection event for just-added files.
        if (addedThisBatch.length) onFilesSelected(addedThisBatch)

        // Auto-open image editor for newly added images if configured.
        if (resolvedImageEditor.enabled && addedThisBatch.length) {
            const newImages = addedThisBatch.filter(f =>
                f.type.startsWith('image/'),
            )

            if (newImages.length > 0) {
                if (
                    resolvedImageEditor.autoOpen === 'single' &&
                    newImages.length === 1
                ) {
                    openImageEditor(newImages[0])
                } else if (resolvedImageEditor.autoOpen === 'always') {
                    // Queue all: first one opens immediately, rest are queued.
                    const [first, ...rest] = newImages
                    openImageEditor(first)
                    if (rest.length) {
                        setEditorQueue(prev => [...prev, ...rest])
                    }
                }
            }
        }

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
            if (crashRecoveryEnabled) void persistFiles(selectedFilesMapCopy)
            onFileRemove(file)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onFileRemove, selectedFilesMap, crashRecoveryEnabled],
    )

    const handleFileRename = useCallback(
        (fileId: string, newName: string) => {
            const file = selectedFilesMap.get(fileId)
            if (!file) return

            const renamedFile = new File([file], newName, {
                type: file.type,
                lastModified: file.lastModified,
            }) as FileWithParams
            copyPreservedFileMetadata(renamedFile, file, {
                preserveUrl: true,
            })

            const copy = new Map(selectedFilesMap)
            copy.set(fileId, renamedFile)
            setSelectedFilesMap(copy)
            if (crashRecoveryEnabled) void persistFiles(copy)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedFilesMap, crashRecoveryEnabled],
    )

    const canReorderFiles = useMemo(
        () =>
            selectedFilesMap.size > 1 &&
            !selectionContainsFolders(selectedFilesMap.values()),
        [selectedFilesMap],
    )

    const reorderFiles = useCallback(
        (sourceId: string, targetId: string) => {
            const reorderedFilesMap = reorderFilesMap(
                selectedFilesMap,
                sourceId,
                targetId,
            )
            if (reorderedFilesMap === selectedFilesMap) return

            setSelectedFilesMap(reorderedFilesMap)
            if (crashRecoveryEnabled) void persistFiles(reorderedFilesMap)
        },
        [selectedFilesMap, crashRecoveryEnabled, persistFiles],
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
                files.forEach(file =>
                    onError(
                        t(translations.errorCompressingFile, {
                            name: file.name,
                        }),
                    ),
                )
                throw error
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onError],
    )

    const compressImageFiles = useCallback(
        async (files: FileWithParams[]) => {
            const opts: ImageCompressionOptions =
                typeof imageCompression === 'object' ? imageCompression : {}
            try {
                return await Promise.all(
                    files.map(file => compressImageFile(file, opts)),
                )
            } catch (error) {
                files.forEach(file =>
                    onError(
                        t(translations.errorCompressingImage, {
                            name: file.name,
                        }),
                    ),
                )
                throw error
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [imageCompression, onError],
    )

    const stripExifDataFiles = useCallback(
        async (files: FileWithParams[]) =>
            Promise.all(files.map(file => stripExifData(file))),
        [],
    )

    const convertHeicFiles = useCallback(
        async (files: FileWithParams[]) =>
            Promise.all(files.map(file => convertHeicFile(file))),
        [],
    )

    const generateThumbnails = useCallback(
        async (files: FileWithParams[]) => {
            const opts: ThumbnailGeneratorOptions =
                typeof thumbnailGenerator === 'object' ? thumbnailGenerator : {}
            return Promise.all(
                files.map(file => generateThumbnailForFile(file, opts)),
            )
        },
        [thumbnailGenerator],
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

            const selectedFiles = dynamicFiles
                ? dynamicFiles
                : Array.from(selectedFilesMap.values())

            // Enforce minimum file count before starting upload
            if (minFiles && selectedFiles.length < minFiles) {
                onError(
                    t(plural(translations, 'minFileCount', minFiles), {
                        limit: minFiles,
                    }),
                )
                return
            }

            // Run onBeforeUpload gate if provided
            if (onBeforeUpload) {
                const result = onBeforeUpload(selectedFilesMap)
                if (result === false) return
            }

            // Enforce max total file size before starting upload
            if (maxTotalFileSize?.size && maxTotalFileSize?.unit) {
                const maxTotalBytes = sizeToBytes(
                    maxTotalFileSize.size,
                    maxTotalFileSize.unit,
                )
                const totalBytes = selectedFiles.reduce(
                    (sum, f) => sum + f.size,
                    0,
                )
                if (totalBytes > maxTotalBytes) {
                    onError(
                        t(translations.totalFileSizeExceeded, {
                            size: maxTotalFileSize.size,
                            unit: maxTotalFileSize.unit,
                        }),
                    )
                    return
                }
            }

            setUploadStatus(UploadStatus.ONGOING)
            setUploadError('')
            const sendEvent = !dynamicFiles
            try {
                const heicConvertedFiles = heicConversionProp
                    ? await convertHeicFiles(selectedFiles)
                    : selectedFiles
                const exifStrippedFiles = stripExifDataProp
                    ? await stripExifDataFiles(heicConvertedFiles)
                    : heicConvertedFiles
                const imageCompressedFiles = imageCompression
                    ? await compressImageFiles(exifStrippedFiles)
                    : exifStrippedFiles
                const thumbnailedFiles = thumbnailGenerator
                    ? await generateThumbnails(imageCompressedFiles)
                    : imageCompressedFiles
                const compressedFiles = shouldCompress
                    ? await compressFiles(thumbnailedFiles)
                    : thumbnailedFiles
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
                    translations: translations,
                })

                // Store SDK ref for pause/resume
                sdkRef.current = sdk
                speedSamplesRef.current = [{ time: Date.now(), bytes: 0 }]

                // Compute full-content SHA-256 checksums before upload
                if (checksumVerificationProp) {
                    await Promise.all(
                        processedFiles.map(async file => {
                            file.checksumSHA256 =
                                await computeFullContentHash(file)
                        }),
                    )
                }

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
                const uploadOne = (file: FileWithParams) =>
                    maxRetries
                        ? uploadWithRetry(
                              () => sdk.upload(file, uploadOptions),
                              maxRetries,
                              (attempt, max) => onRetry?.(file, attempt, max),
                          )
                        : sdk.upload(file, uploadOptions)

                let uploadResults: Awaited<ReturnType<typeof uploadOne>>[]
                if (
                    maxConcurrentUploads &&
                    maxConcurrentUploads > 0 &&
                    maxConcurrentUploads < filesToUpload.length
                ) {
                    // Concurrency-limited upload
                    uploadResults = []
                    const queue = [...filesToUpload]
                    const active: Promise<void>[] = []
                    while (queue.length > 0 || active.length > 0) {
                        while (
                            active.length < maxConcurrentUploads &&
                            queue.length > 0
                        ) {
                            const file = queue.shift()!
                            const p = uploadOne(file).then(result => {
                                uploadResults.push(result)
                                active.splice(active.indexOf(p), 1)
                            })
                            active.push(p)
                        }
                        if (active.length > 0) await Promise.race(active)
                    }
                } else {
                    uploadResults = await Promise.all(
                        filesToUpload.map(uploadOne),
                    )
                }
                const finalFiles = uploadResults.map(result => result.file)
                if (sendEvent) onFilesUploadComplete(finalFiles)

                sdkRef.current = null
                setUploadStatus(UploadStatus.SUCCESSFUL)
                if (crashRecoveryEnabled) void clearPersistedFiles()
                return finalFiles
            } catch (error) {
                onError((error as Error).message)
                sdkRef.current = null
                setUploadStatus(UploadStatus.FAILED)
                // Preserve filesProgressMap so progress stays visible alongside the Retry button
                return
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            maxConcurrentUploads,
            minFiles,
            maxTotalFileSize,
            translations,
            checksumVerificationProp,
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
        if (crashRecoveryEnabled) void clearPersistedFiles()
    }, [
        resumable?.mode,
        selectedFilesMap,
        crashRecoveryEnabled,
        clearPersistedFiles,
    ])

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

    // Auto-upload: trigger upload as soon as files are selected
    useEffect(() => {
        if (autoUpload && selectedFilesMap.size > 0) {
            proceedUpload()
        }
    }, [autoUpload, selectedFilesMap, proceedUpload])

    // Auto-open: set initial adapter on mount
    useEffect(() => {
        if (autoOpen) {
            setActiveAdapter(autoOpen)
        }
    }, [autoOpen])

    // Resolve dark mode: support 'auto' via media query
    const resolvedDark = useMemo(() => {
        if (dark === 'auto') {
            return (
                typeof window !== 'undefined' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches
            )
        }
        return !!dark
    }, [dark])

    return {
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        translations,
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
        handleFileRename,
        canReorderFiles,
        reorderFiles,
        editingFile,
        openImageEditor,
        closeImageEditor,
        saveImageEdit,
        replaceFile,
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
            dark: resolvedDark,
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
            minFileSize,
            minFiles,
            maxTotalFileSize,
            limit,
            isProcessing,
            allowPreview,
            showSelectFolderButton,
            showRemoveButtonAfterComplete,
            hideUploadButton,
            disableLocalFiles,
            disabled,
            hideCancelButton,
            hidePauseResumeButton,
            hideProgressAfterFinish,
            hideRetryButton,
            disableInformer,
            showSelectedFiles,
            allowMultipleUploadBatches,
            infoTimeout,
            meta,
            width,
            height,
            autoOpen,
            onBeforeUpload,
            note,
            multiple,
            icons: {
                ContainerAddMoreIcon: icons.ContainerAddMoreIcon || TbPlus,
                FileDeleteIcon: icons.FileDeleteIcon || TbTrash,
                CameraCaptureIcon: icons.CameraCaptureIcon || TbCapture,
                CameraRotateIcon: icons.CameraRotateIcon || TbCameraRotate,
                CameraMirrorIcon: icons.CameraMirrorIcon || TbFlipHorizontal,
                CameraDeleteIcon: icons.CameraDeleteIcon || TbTrash,
                CameraVideoRecordIcon: icons.CameraVideoRecordIcon || TbVideo,
                CameraVideoStopIcon: icons.CameraVideoStopIcon || TbPlayerStop,
                CameraVideoDeleteIcon: icons.CameraVideoDeleteIcon || TbTrash,
                LoaderIcon: icons.LoaderIcon || TbLoader,
                AudioRecordIcon: icons.AudioRecordIcon || TbMicrophone,
                AudioStopIcon: icons.AudioStopIcon || TbPlayerStop,
                AudioDeleteIcon: icons.AudioDeleteIcon || TbTrash,
                ScreenCaptureStartIcon:
                    icons.ScreenCaptureStartIcon || TbScreenShare,
                ScreenCaptureStopIcon:
                    icons.ScreenCaptureStopIcon || TbPlayerStop,
                ScreenCaptureDeleteIcon:
                    icons.ScreenCaptureDeleteIcon || TbTrash,
            },
            classNames,
            imageEditor: resolvedImageEditor,
            reducedMotion,
            contentDeduplication,
            stripExifData: stripExifDataProp,
            heicConversion: heicConversionProp,
            checksumVerification: checksumVerificationProp,
        },
        informer,
    }
}
