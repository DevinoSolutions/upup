
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    FileSource,
    LOCALE_META,
    UploadStatus,
    createTranslator,
    enUS,
    flattenTranslatorToUiTranslations,
    flattenSlotsToClassNames,
    resolveTheme,
    type FilesProgressMap,
    type LocaleBundle,
    type Translator,
    type UploadFile,
    type UpupThemeMode,
} from '@upup/core'
import {
    TbCameraRotate,
    TbCapture,
    TbLoader,
    TbPlus,
    TbTrash,
} from 'react-icons/tb'
import { resolveAccept } from '../shared/lib/acceptPresets'
import {
    ResolvedImageEditorOptions,
    UpupUploaderProps,
} from '../shared/types'
import { IRootContext } from '../context/RootContext'
import { revokeFileUrl, sizeToBytes } from '../lib/file'
import {
    blobToUploadFile,
    dataURLtoBlob,
} from '../lib/imageEditorHelpers'
import {
    fileFingerprint,
    loadSession,
} from '../lib/resumable/multipartSessionStore'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from './useSSEProcessing'

function getDir(locale: string | LocaleBundle | undefined): 'ltr' | 'rtl' {
    if (locale && typeof locale === 'object' && 'dir' in locale) return locale.dir
    const code = typeof locale === 'string' ? locale : 'en-US'
    const base = code.split('-')[0]
    const meta = LOCALE_META[code]
        ?? Object.values(LOCALE_META).find(m => m.code.startsWith(base + '-'))
    return meta?.dir ?? 'ltr'
}

function useResolvedThemeMode(mode: UpupThemeMode | undefined): 'light' | 'dark' {
    const requestedMode = mode ?? 'light'
    const [systemMode, setSystemMode] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        if (requestedMode !== 'system') return
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const update = () => setSystemMode(media.matches ? 'dark' : 'light')
        update()
        media.addEventListener?.('change', update)
        return () => media.removeEventListener?.('change', update)
    }, [requestedMode])

    if (requestedMode === 'system') return systemMode
    return requestedMode
}

function normalizeSource(source: string): FileSource | undefined {
    return (Object.values(FileSource) as string[]).includes(source)
        ? source as FileSource
        : undefined
}

const DEFAULT_SOURCES = [
    FileSource.LOCAL,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.MICROPHONE,
    FileSource.SCREEN,
]

const EMPTY_THEME_SLOTS = {}
const EMPTY_STYLE = {}
const DEFAULT_MAX_FILE_SIZE = { size: 1, unit: 'GB' as const }

export default function useRootProvider({
    allowedFileTypes: acceptProp = '*',
    mini = false,
    theme,
    maxFiles,
    isProcessing = false,
    allowPreview = true,
    folderUpload,
    showBranding = true,
    disableDragDrop = false,
    className,
    style,
    maxFileSize: maxFileSizeProp,
    minFileSize: minFileSizeProp,
    maxTotalFileSize: maxTotalFileSizeProp,
    restrictions,
    imageCompression = false,
    thumbnailGenerator = false,
    checksumVerification = false,
    heicConversion = false,
    stripExifData = false,
    contentDeduplication = false,
    crashRecovery = false,
    sources,
    onError: errorHandler,
    onWarn: warningHandler,
    icons = {},
    i18n,
    onIntegrationClick = () => {},
    onFileClick = () => {},
    onFileRemove: onFileRemoveProp = () => {},
    onFileRemoved,
    onStatusChange,
    onFilesDragOver = () => {},
    onFilesDragLeave = () => {},
    onFilesDrop = () => {},
    onFileTypeMismatch = () => {},
    onBeforeFileAdded,
    onRestrictionFailed,
    enablePaste = false,
    autoUpload = false,
    maxConcurrentUploads,
    imageEditor: imageEditorProp,
    onUploadStart = () => {},
    onFileUploadStart = () => {},
    onFileUploadProgress = () => {},
    onFilesUploadProgress = () => {},
    onFileUploadComplete = () => {},
    onFilesUploadComplete = () => {},
    onUploadComplete = () => {},
    onFilesSelected = () => {},
    onDoneClicked = () => {},
    onPrepareFiles,
    provider,
    mode: modeProp,
    uploadEndpoint,
    serverUrl,
    cloudDrives,
    metadata,
    cors,
    maxRetries,
    resumable,
    processingEndpoint,
    onFileProcessed,
    processingTimeout,
}: UpupUploaderProps): IRootContext {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isAddingMore, setIsAddingMore] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [isOnline, setIsOnline] = useState(true)
    const [activeAdapter, setActiveAdapter] = useState<FileSource>()
    const [filesProgressMap, setFilesProgressMap] = useState<FilesProgressMap>({})
    const [uploadError, setUploadError] = useState('')
    const [uploadSpeed, setUploadSpeed] = useState(0)
    const [uploadEta, setUploadEta] = useState(0)
    const [uploadedBytes, setUploadedBytes] = useState(0)
    const [totalBytes, setTotalBytes] = useState(0)
    const [editingFile, setEditingFile] = useState<UploadFile | null>(null)
    const [editorQueue, setEditorQueue] = useState<UploadFile[]>([])
    const speedSamplesRef = useRef<{ time: number; bytes: number }[]>([])
    const totalBytesRef = useRef(0)
    const crashRecoveryRestoreRef = useRef(false)

    const resolvedSources = useMemo(
        () => sources
            ? sources.map(source => normalizeSource(source)).filter(Boolean) as FileSource[]
            : DEFAULT_SOURCES,
        [sources],
    )
    const resolvedLimit = maxFiles ?? restrictions?.maxNumberOfFiles ?? 10
    const resolvedMode = modeProp ?? (serverUrl && !uploadEndpoint ? 'server' : 'client')
    const resolvedServerUrl = serverUrl
    const resolvedEndpoint = uploadEndpoint
    const themeMode = useResolvedThemeMode(theme?.mode)
    const resolvedTheme = useMemo(
        () => resolveTheme({ ...(theme ?? {}), mode: themeMode }),
        [theme, themeMode],
    )
    const themeSlots = resolvedTheme.slots
    const resolvedSlotClasses = useMemo(
        () => flattenSlotsToClassNames(themeSlots),
        [themeSlots],
    )
    const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
    const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
    const maxTotalFileSize = maxTotalFileSizeProp ?? restrictions?.maxTotalFileSize
    const accept = resolveAccept(restrictions?.allowedFileTypes ? restrictions.allowedFileTypes.join(',') : acceptProp)
    const folderUploadAllowDrop = folderUpload?.allowDrop ?? false
    const folderPickerButtonVisible = folderUpload?.showSelectFolderButton ?? false
    const emitFileRemoved = useCallback((file: UploadFile) => {
        onFileRemoveProp(file as never)
        if (onFileRemoved && onFileRemoved !== onFileRemoveProp) {
            onFileRemoved(file as never)
        }
    }, [onFileRemoveProp, onFileRemoved])
    const limit = useMemo(() => (mini ? 1 : Math.max(resolvedLimit, 1)), [mini, resolvedLimit])
    const multiple = useMemo(() => (mini ? false : limit > 1), [limit, mini])

    const localeCandidate = i18n?.locale as unknown
    const bundle = i18n?.bundle ?? (
        localeCandidate &&
        typeof localeCandidate === 'object' &&
        'code' in localeCandidate &&
        'messages' in localeCandidate
            ? localeCandidate as LocaleBundle
            : undefined
    )
    const fallbackCandidate = i18n?.fallbackLocale as unknown
    const fallbackBundle = (
        fallbackCandidate &&
        typeof fallbackCandidate === 'object' &&
        'code' in fallbackCandidate &&
        'messages' in fallbackCandidate
            ? fallbackCandidate as LocaleBundle
            : undefined
    )
    const translator = useMemo<Translator>(
        () => createTranslator({
            bundle: bundle ?? enUS,
            fallback: fallbackBundle ?? enUS,
            overrides: i18n?.overrides as never,
        }),
        [bundle, fallbackBundle, i18n?.overrides],
    )
    const translations = useMemo(
        () => flattenTranslatorToUiTranslations(translator),
        [translator],
    )
    const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
    const dir = bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)
    const onError = useCallback((message: string) => {
        setUploadError(message)
        errorHandler?.(message)
    }, [errorHandler])
    const onWarn = useCallback((message: string) => {
        warningHandler?.(message)
    }, [warningHandler])

    const coreCloudDrives = cloudDrives ? {
        googleDrive: cloudDrives.googleDrive,
        oneDrive: cloudDrives.oneDrive ? {
            clientId: cloudDrives.oneDrive.clientId,
            authority: cloudDrives.oneDrive.redirectUri,
        } : undefined,
        dropbox: cloudDrives.dropbox ? {
            appKey: cloudDrives.dropbox.clientId,
        } : undefined,
    } : undefined

    const upload = useUpupUpload({
        uploadEndpoint: resolvedEndpoint || undefined,
        serverUrl: resolvedServerUrl,
        provider,
        mode: resolvedMode,
        allowedFileTypes: accept,
        limit,
        maxFileSize,
        minFileSize,
        maxTotalFileSize,
        maxRetries,
        onBeforeFileAdded,
        imageCompression,
        thumbnailGenerator,
        checksumVerification,
        heicConversion,
        stripExifData,
        contentDeduplication,
        crashRecovery,
        maxConcurrentUploads,
        metadata,
        cors,
        resumable,
        cloudDrives: coreCloudDrives,
        onError: (err) => onError(typeof err === 'string' ? err : err.message),
    })
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed: onFileProcessed as never,
        onError: (err) => onError(err.message),
        processingTimeout,
    })
    const core = upload.core
    useEffect(() => {
        if (!crashRecovery || crashRecoveryRestoreRef.current) return
        crashRecoveryRestoreRef.current = true
        void core.restoreFromCrashRecovery().catch(() => undefined)
    }, [core, crashRecovery])

    const files = useMemo(
        () => new Map(upload.files.map(file => [file.id, file] as const)),
        [upload.files],
    )
    const uploadStatus = upload.status
    const totalProgress = upload.progress.percentage

    const resolvedImageEditor = useMemo<ResolvedImageEditorOptions>(() => {
        if (imageEditorProp === true) {
            return { enabled: true, autoOpen: 'never', display: 'inline' }
        }
        if (typeof imageEditorProp === 'object' && imageEditorProp !== null) {
            return {
                ...imageEditorProp,
                enabled: imageEditorProp.enabled ?? true,
                autoOpen: imageEditorProp.autoOpen ?? 'never',
                display: imageEditorProp.display ?? 'inline',
            }
        }
        return { enabled: false, autoOpen: 'never', display: 'inline' }
    }, [imageEditorProp])
    const resolvedIcons = useMemo(() => ({
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon || TbPlus,
        FileDeleteIcon: icons.FileDeleteIcon || TbTrash,
        CameraCaptureIcon: icons.CameraCaptureIcon || TbCapture,
        CameraRotateIcon: icons.CameraRotateIcon || TbCameraRotate,
        CameraDeleteIcon: icons.CameraDeleteIcon || TbTrash,
        LoaderIcon: icons.LoaderIcon || TbLoader,
    }), [
        icons.CameraCaptureIcon,
        icons.CameraDeleteIcon,
        icons.CameraRotateIcon,
        icons.ContainerAddMoreIcon,
        icons.FileDeleteIcon,
        icons.LoaderIcon,
    ])
    const oneDriveConfigs = useMemo(() => cloudDrives?.oneDrive ? {
        onedrive_client_id: cloudDrives.oneDrive.clientId,
        redirectUri: cloudDrives.oneDrive.redirectUri,
    } : undefined, [
        cloudDrives?.oneDrive?.clientId,
        cloudDrives?.oneDrive?.redirectUri,
    ])
    const googleDriveConfigs = useMemo(() => cloudDrives?.googleDrive ? {
        google_client_id: cloudDrives.googleDrive.clientId,
        google_api_key: cloudDrives.googleDrive.apiKey,
        google_app_id: cloudDrives.googleDrive.appId,
    } : undefined, [
        cloudDrives?.googleDrive?.apiKey,
        cloudDrives?.googleDrive?.appId,
        cloudDrives?.googleDrive?.clientId,
    ])
    const dropboxConfigs = useMemo(() => cloudDrives?.dropbox ? {
        dropbox_client_id: cloudDrives.dropbox.clientId,
        dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
    } : undefined, [
        cloudDrives?.dropbox?.clientId,
        cloudDrives?.dropbox?.redirectUri,
    ])
    const boxConfigs = useMemo(() => cloudDrives?.box ? {
        box_client_id: cloudDrives.box.clientId,
        box_redirect_uri: cloudDrives.box.redirectUri,
    } : undefined, [
        cloudDrives?.box?.clientId,
        cloudDrives?.box?.redirectUri,
    ])
    const resolvedStyle = style ?? EMPTY_STYLE

    useEffect(() => {
        onStatusChange?.(upload.status.toLowerCase())
    }, [upload.status, onStatusChange])

    useEffect(() => {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            setIsOnline(navigator.onLine)
        }
        const handleOnline = () => {
            setIsOnline(true)
            core?.emit('connection-online', {})
        }
        const handleOffline = () => {
            setIsOnline(false)
            core?.emit('connection-offline', {})
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [core])

    useEffect(() => {
        if (!core) return
        const unsubUploadStart = core.on('upload-start', () => {
            onUploadStart()
        })
        const unsubStart = core.on('file-upload-start', (payload: unknown) => {
            const file = (payload as { file?: UploadFile })?.file
            if (file) onFileUploadStart(file as never)
        })
        const unsubAdded = core.on('files-added', (payload: unknown) => {
            const added = payload as UploadFile[]
            if (!Array.isArray(added) || added.length === 0) return
            onFilesSelected(added as never)
            if (resolvedImageEditor.enabled) {
                const images = added.filter(file => file.type.startsWith('image/'))
                if (resolvedImageEditor.autoOpen === 'single' && images.length === 1) {
                    setEditorQueue(prev => [...prev, images[0]])
                }
                if (resolvedImageEditor.autoOpen === 'always') {
                    setEditorQueue(prev => [...prev, ...images])
                }
            }
            if (autoUpload) {
                core.emit('auto-upload', { count: added.length })
                setTimeout(() => { void upload.upload() }, 0)
            }
        })
        const unsubRemoved = core.on('file-removed', (payload: unknown) => {
            emitFileRemoved(payload as never)
        })
        const unsubProgress = core.on('upload-progress', (payload: unknown) => {
            const progress = payload as { fileId: string; loaded: number; total: number }
            const file = core.files.get(progress.fileId)
            setFilesProgressMap(prev => ({
                ...prev,
                [progress.fileId]: {
                    id: progress.fileId,
                    loaded: progress.loaded,
                    total: progress.total,
                },
            }))
            const now = Date.now()
            const nextUploaded = Object.values({
                ...filesProgressMap,
                [progress.fileId]: {
                    id: progress.fileId,
                    loaded: progress.loaded,
                    total: progress.total,
                },
            }).reduce((sum, item) => sum + item.loaded, 0)
            setUploadedBytes(nextUploaded)
            speedSamplesRef.current.push({ time: now, bytes: nextUploaded })
            speedSamplesRef.current = speedSamplesRef.current.filter(sample => sample.time >= now - 3000)
            if (speedSamplesRef.current.length >= 2) {
                const oldest = speedSamplesRef.current[0]
                const newest = speedSamplesRef.current[speedSamplesRef.current.length - 1]
                const elapsed = (newest.time - oldest.time) / 1000
                if (elapsed > 0) {
                    const speed = Math.max(0, (newest.bytes - oldest.bytes) / elapsed)
                    setUploadSpeed(speed)
                    const remaining = totalBytesRef.current - nextUploaded
                    setUploadEta(speed > 0 ? Math.ceil(remaining / speed) : 0)
                }
            }
            if (file) {
                onFileUploadProgress(file as never, {
                    loaded: progress.loaded,
                    total: progress.total,
                    percentage: progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0,
                })
            }
            onFilesUploadProgress(core.progress.completedFiles, core.progress.totalFiles)
        })
        const unsubSuccess = core.on('upload-success', (payload: unknown) => {
            const { file, result } = payload as { file?: UploadFile; result?: { key?: string } }
            if (file) onFileUploadComplete(file as never, result?.key ?? file.key ?? '')
        })
        const unsubComplete = core.on('upload-all-complete', (payload: unknown) => {
            const completed = payload as UploadFile[]
            onFilesUploadComplete(completed as never)
            onUploadComplete(completed as never)
            completed.forEach(file => connectSSE(file as never))
        })
        const unsubError = core.on('upload-error', (payload: unknown) => {
            const err = (payload as { error?: Error })?.error
            if (err) onError(err.message)
        })
        return () => {
            unsubUploadStart()
            unsubStart()
            unsubAdded()
            unsubRemoved()
            unsubProgress()
            unsubSuccess()
            unsubComplete()
            unsubError()
        }
    }, [
        autoUpload,
        connectSSE,
        core,
        filesProgressMap,
        onError,
        emitFileRemoved,
        onFileUploadComplete,
        onFileUploadProgress,
        onFileUploadStart,
        onFilesSelected,
        onFilesUploadComplete,
        onFilesUploadProgress,
        onUploadComplete,
        onUploadStart,
        resolvedImageEditor,
        upload,
    ])

    useEffect(() => {
        const total = upload.files.reduce((sum, file) => sum + file.size, 0)
        setTotalBytes(total)
        totalBytesRef.current = total
    }, [upload.files])

    const openImageEditor = useCallback((file: UploadFile) => {
        setEditingFile(file)
        resolvedImageEditor.onOpen?.(file as never)
        core?.emit('image-editor-open', { file })
    }, [core, resolvedImageEditor])

    useEffect(() => {
        if (editingFile || editorQueue.length === 0) return
        const [next, ...rest] = editorQueue
        setEditorQueue(rest)
        openImageEditor(next)
    }, [editingFile, editorQueue, openImageEditor])

    const closeImageEditor = useCallback(() => {
        const current = editingFile
        setEditingFile(null)
        if (current) {
            resolvedImageEditor.onCancel?.(current as never)
            core?.emit('image-editor-cancel', { file: current })
        }
    }, [core, editingFile, resolvedImageEditor])

    const replaceFile = useCallback((fileId: string, newFile: UploadFile) => {
        core?.replaceFile(fileId, newFile)
    }, [core])

    const saveImageEdit = useCallback((editedImageData: string, mimeType?: string) => {
        if (!editingFile) return
        const outputMime = mimeType || resolvedImageEditor.output?.mimeType || editingFile.type
        const blob = new Blob([dataURLtoBlob(editedImageData)], { type: outputMime })
        const newFile = blobToUploadFile(blob, editingFile, resolvedImageEditor.output)
        revokeFileUrl(editingFile as never)
        core?.replaceFile(editingFile.id, newFile)
        resolvedImageEditor.onSave?.(newFile as never, editingFile as never)
        core?.emit('image-editor-save', { file: newFile, original: editingFile })
        setEditingFile(null)
    }, [core, editingFile, resolvedImageEditor])

    const handleSetSelectedFiles = useCallback(async (newFiles: File[]) => {
        try {
            await upload.addFiles(newFiles)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            onError(message)
            const first = newFiles[0]
            if (first) {
                if (message.toLowerCase().includes('type')) {
                    onFileTypeMismatch(first, accept)
                    onRestrictionFailed?.(first, 'TYPE_MISMATCH')
                } else if (message.toLowerCase().includes('limit')) {
                    onRestrictionFailed?.(first, 'LIMIT_EXCEEDED')
                } else if (message.toLowerCase().includes('below')) {
                    onRestrictionFailed?.(first, 'FILE_TOO_SMALL')
                } else if (message.toLowerCase().includes('size')) {
                    onRestrictionFailed?.(first, 'FILE_TOO_LARGE')
                }
            }
        }
    }, [accept, onError, onFileTypeMismatch, onRestrictionFailed, upload])

    const proceedUpload = useCallback(async () => {
        if (upload.files.length === 0) return undefined
        setUploadError('')
        const prepared = onPrepareFiles ? await onPrepareFiles(upload.files as never) : upload.files
        if (prepared !== upload.files) {
            await upload.setFiles(prepared as File[])
        }
        speedSamplesRef.current = [{ time: Date.now(), bytes: 0 }]
        return await upload.upload() as never
    }, [onPrepareFiles, upload])

    const retryUpload = useCallback(async (fileId?: string) => {
        if (upload.files.length === 0) return undefined
        setUploadError('')
        speedSamplesRef.current = [{ time: Date.now(), bytes: 0 }]
        return await upload.retry(fileId) as never
    }, [upload])

    const dynamicUpload = useCallback(async (newFiles: File[] | UploadFile[]) => {
        await upload.setFiles(newFiles as File[])
        return await upload.upload() as never
    }, [upload])

    const dynamicallyReplaceFiles = useCallback((newFiles: File[] | UploadFile[]) => {
        upload.files.forEach(file => revokeFileUrl(file as never))
        void upload.setFiles(newFiles as File[])
    }, [upload])

    const handleFileRemove = useCallback((fileId: string) => {
        const file = files.get(fileId)
        if (file) revokeFileUrl(file as never)
        upload.removeFile(fileId)
    }, [files, upload])

    const handleCancel = useCallback(() => {
        upload.cancel()
        upload.files.forEach(file => revokeFileUrl(file as never))
        upload.removeAll()
        setFilesProgressMap({})
        setUploadSpeed(0)
        setUploadEta(0)
        setUploadedBytes(0)
        setTotalBytes(0)
    }, [upload])

    const handlePause = useCallback(() => {
        upload.pause()
    }, [upload])

    const handleResume = useCallback(() => {
        speedSamplesRef.current = [{ time: Date.now(), bytes: uploadedBytes }]
        upload.resume()
    }, [upload, uploadedBytes])

    const handleDone = useCallback(() => {
        onDoneClicked()
        core?.emit('done', {})
        handleCancel()
    }, [core, handleCancel, onDoneClicked])

    const resetState = useCallback(async () => {
        setIsAddingMore(false)
        core?.emit('state-reset', {})
        handleDone()
    }, [core, handleDone])

    useEffect(() => {
        if (!resumable || resumable.protocol !== 'multipart') return
        const progressMap: FilesProgressMap = {}
        upload.files.forEach(file => {
            const session = loadSession(fileFingerprint(file as never))
            if (session) {
                progressMap[file.id] = {
                    id: file.id,
                    loaded: session.uploadedBytes ?? 0,
                    total: file.size,
                }
            }
        })
        if (Object.keys(progressMap).length > 0) {
            setFilesProgressMap(progressMap)
        }
    }, [resumable, upload.files])

    return {
        core,
        mode: resolvedMode,
        serverUrl: resolvedServerUrl,
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        viewMode,
        setViewMode,
        isOnline,
        translations,
        translator,
        lang,
        dir,
        theme: {
            themeMode: resolvedTheme.mode as 'light' | 'dark',
            isDark: resolvedTheme.mode === 'dark',
            tokens: resolvedTheme.tokens,
            resolved: resolvedTheme as typeof resolvedTheme & { mode: 'light' | 'dark' },
            slotOverrides: resolvedSlotClasses,
            slots: themeSlots ?? EMPTY_THEME_SLOTS,
        },
        files: files as never,
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        editingFile: editingFile as never,
        openImageEditor: openImageEditor as never,
        closeImageEditor,
        saveImageEdit,
        replaceFile: replaceFile as never,
        oneDriveConfigs,
        googleDriveConfigs,
        dropboxConfigs,
        boxConfigs,
        upload: {
            totalProgress,
            filesProgressMap,
            proceedUpload,
            retryUpload,
            uploadStatus,
            setUploadStatus: () => {},
            uploadError,
            uploadSpeed,
            uploadEta,
            uploadedBytes,
            totalBytes,
        },
        props: {
            mini,
            maxRetries,
            resumable,
            onError,
            onIntegrationClick,
            onFileClick,
            onFilesDragOver,
            onFilesDragLeave,
            onFilesDrop,
            onWarn,
            enablePaste,
            sources: resolvedSources,
            allowedFileTypes: accept,
            maxFileSize,
            limit,
            isProcessing,
            allowPreview,
            folderUploadAllowDrop,
            folderPickerButtonVisible,
            showBranding,
            disableDragDrop,
            className: className ?? '',
            style: resolvedStyle,
            multiple,
            icons: resolvedIcons,
            imageEditor: resolvedImageEditor,
        },
    }
}
