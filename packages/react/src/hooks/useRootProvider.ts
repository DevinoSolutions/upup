
import { createElement, Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
    FileSource,
    UploadStatus,
    UploaderOrchestrator,
    createTranslator,
    enUS,
    flattenTranslatorToUiTranslations,
    flattenSlotsToClassNames,
    resolveAccept,
    resolveTheme,
    DropboxPlugin,
    GoogleDrivePlugin,
    BoxPlugin,
    OneDrivePlugin,
    getDir,
    normalizeSource,
    DEFAULT_SOURCES,
    DEFAULT_MAX_FILE_SIZE,
    type OrchestratorCallbacks,
    type OrchestratorState,
    type LocaleBundle,
    type Translator,
    type UploadFile,
    type UpupThemeMode,
    type ResolvedImageEditorOptions,
} from '@upup/core'
import {
    TbCameraRotate,
    TbCapture,
    TbPlus,
    TbTrash,
} from 'react-icons/tb'
import Icon from '../components/Icon'
import { UpupUploaderProps } from '../shared/types'
import { IRootContext } from '../context/RootContext'
import { revokeFileUrl } from '../lib/file'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from './useSSEProcessing'

/** Default loader icon — renders the registry 'loader' glyph via the shared Icon renderer
 *  (which applies the stroke attrs, so the glyph is visible). Forwards size/class like the
 *  former react-icons default did. */
const DefaultLoaderIconComponent = (props: { size?: number; className?: string }) =>
    createElement(Icon, { name: 'loader', ...props })

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

const EMPTY_THEME_SLOTS = {}
const EMPTY_STYLE = {}

/** Stable server snapshot for SSR (useSyncExternalStore third arg). */
const SERVER_SNAPSHOT: OrchestratorState = {
    files: new Map(),
    uploadStatus: UploadStatus.IDLE,
    uploadError: '',
    totalProgress: 0,
    filesProgressMap: {},
    uploadSpeed: 0,
    uploadEta: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    activeAdapter: undefined,
    editingFile: null,
    editorQueue: [],
    isAddingMore: false,
    viewMode: 'grid',
    isOnline: true,
}

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
    webWorker,
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
    // ── Resolved props ──────────────────────────────────────────
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
    const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
    const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
    const maxTotalFileSize = maxTotalFileSizeProp ?? restrictions?.maxTotalFileSize
    const accept = resolveAccept(restrictions?.allowedFileTypes ? restrictions.allowedFileTypes.join(',') : acceptProp)
    const folderUploadAllowDrop = folderUpload?.allowDrop ?? false
    const folderPickerButtonVisible = folderUpload?.showSelectFolderButton ?? false
    const limit = useMemo(() => (mini ? 1 : Math.max(resolvedLimit, 1)), [mini, resolvedLimit])
    const multiple = useMemo(() => (mini ? false : limit > 1), [limit, mini])

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

    // ── Core (via useUpupUpload) ────────────────────────────────
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

    const onError = useCallback((message: string) => {
        errorHandler?.(message)
    }, [errorHandler])
    const onWarn = useCallback((message: string) => {
        warningHandler?.(message)
    }, [warningHandler])

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
        webWorker,
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
    const core = upload.core

    // ── SSE processing ──────────────────────────────────────────
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: (err) => onError(err.message),
        processingTimeout,
    })

    // ── Callback refs (always fresh, no stale closures) ─────────
    const callbackRefs = useRef<OrchestratorCallbacks>({})
    callbackRefs.current = {
        onError,
        onWarn,
        onUploadStart,
        onFileUploadStart,
        onFileUploadProgress,
        onFilesUploadProgress,
        onFileUploadComplete,
        onFilesUploadComplete,
        onUploadComplete,
        onFilesSelected,
        onDoneClicked,
        onPrepareFiles,
        onFileRemoved: (file: UploadFile) => {
            onFileRemoveProp(file)
            if (onFileRemoved && onFileRemoved !== onFileRemoveProp) {
                onFileRemoved(file)
            }
        },
        imageEditorOptions: resolvedImageEditor,
        autoUpload,
    }

    // ── Orchestrator (created once, bound to core) ──────────────
    const orchRef = useRef<UploaderOrchestrator | null>(null)
    const connectSSERef = useRef(connectSSE)
    connectSSERef.current = connectSSE

    if (!orchRef.current && core) {
        // Wrap callbacks so they always call the latest ref
        const proxiedCallbacks: OrchestratorCallbacks = {
            get onError() { return callbackRefs.current.onError },
            get onWarn() { return callbackRefs.current.onWarn },
            get onUploadStart() { return callbackRefs.current.onUploadStart },
            get onFileUploadStart() { return callbackRefs.current.onFileUploadStart },
            get onFileUploadProgress() { return callbackRefs.current.onFileUploadProgress },
            get onFilesUploadProgress() { return callbackRefs.current.onFilesUploadProgress },
            get onFileUploadComplete() { return callbackRefs.current.onFileUploadComplete },
            get onFilesUploadComplete() { return (...args: Parameters<NonNullable<OrchestratorCallbacks['onFilesUploadComplete']>>) => {
                callbackRefs.current.onFilesUploadComplete?.(...args)
                // SSE connection after upload complete
                const completed = args[0]
                if (Array.isArray(completed)) {
                    completed.forEach(file => connectSSERef.current(file))
                }
            }},
            get onUploadComplete() { return callbackRefs.current.onUploadComplete },
            get onFilesSelected() { return callbackRefs.current.onFilesSelected },
            get onDoneClicked() { return callbackRefs.current.onDoneClicked },
            get onPrepareFiles() { return callbackRefs.current.onPrepareFiles },
            get onFileRemoved() { return callbackRefs.current.onFileRemoved },
            get imageEditorOptions() { return callbackRefs.current.imageEditorOptions },
            get autoUpload() { return callbackRefs.current.autoUpload },
        }
        orchRef.current = new UploaderOrchestrator(core, proxiedCallbacks)
    }
    const orch = orchRef.current!

    // ── Subscribe to orchestrator state (React 18 pattern) ──────
    const getServerSnapshot = useCallback(() => SERVER_SNAPSHOT, [])
    const state = useSyncExternalStore(
        orch?.subscribe ?? (() => () => {}),
        orch?.getSnapshot ?? (() => SERVER_SNAPSHOT),
        getServerSnapshot,
    )

    // ── Orchestrator lifecycle ───────────────────────────────────
    useEffect(() => {
        orch?.init()
        return () => orch?.destroy()
    }, [orch])

    // ── Crash recovery ──────────────────────────────────────────
    const crashRecoveryRestoreRef = useRef(false)
    useEffect(() => {
        if (!crashRecovery || crashRecoveryRestoreRef.current) return
        crashRecoveryRestoreRef.current = true
        void core.restoreFromCrashRecovery().catch(() => undefined)
    }, [core, crashRecovery])

    // ── Theme resolution (framework-specific) ───────────────────
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

    // ── I18n resolution (framework-specific) ────────────────────
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
            overrides: i18n?.overrides,
        }),
        [bundle, fallbackBundle, i18n?.overrides],
    )
    const translations = useMemo(
        () => flattenTranslatorToUiTranslations(translator),
        [translator],
    )
    const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
    const dir = bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)

    // ── Icons resolution (framework-specific) ───────────────────
    const resolvedIcons = useMemo(() => ({
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon || TbPlus,
        FileDeleteIcon: icons.FileDeleteIcon || TbTrash,
        CameraCaptureIcon: icons.CameraCaptureIcon || TbCapture,
        CameraRotateIcon: icons.CameraRotateIcon || TbCameraRotate,
        CameraDeleteIcon: icons.CameraDeleteIcon || TbTrash,
        LoaderIcon: icons.LoaderIcon || DefaultLoaderIconComponent,
    }), [
        icons.CameraCaptureIcon,
        icons.CameraDeleteIcon,
        icons.CameraRotateIcon,
        icons.ContainerAddMoreIcon,
        icons.FileDeleteIcon,
        icons.LoaderIcon,
    ])

    // ── Cloud drive configs (framework-specific) ────────────────
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

    // ── Plugin registration (cloud drives) ──────────────────────
    const adapterPluginsRef = useRef<Array<{ destroy(): void }>>([])
    useEffect(() => {
        if (!core) return
        adapterPluginsRef.current.forEach(p => p.destroy())
        adapterPluginsRef.current = []

        const plugins: Array<{ destroy(): void }> = []

        if (googleDriveConfigs) {
            const plugin = new GoogleDrivePlugin()
            plugin.configure(googleDriveConfigs)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }
        if (dropboxConfigs) {
            const plugin = new DropboxPlugin()
            plugin.configure(dropboxConfigs)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }
        if (boxConfigs) {
            const plugin = new BoxPlugin()
            plugin.configure(boxConfigs)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }
        if (oneDriveConfigs) {
            const plugin = new OneDrivePlugin()
            plugin.configure(oneDriveConfigs)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }

        adapterPluginsRef.current = plugins

        return () => {
            plugins.forEach(p => p.destroy())
            adapterPluginsRef.current = []
        }
    }, [core, googleDriveConfigs, dropboxConfigs, boxConfigs, oneDriveConfigs])

    // ── Status change callback ──────────────────────────────────
    useEffect(() => {
        onStatusChange?.(state.uploadStatus.toLowerCase())
    }, [state.uploadStatus, onStatusChange])

    // ── Input ref (React-specific) ──────────────────────────────
    const inputRef = useRef<HTMLInputElement>(null)
    const openFilePicker = useCallback(() => {
        inputRef.current?.click()
    }, [])

    // ── React-compatible setters (support Dispatch<SetStateAction<T>>) ──
    const setActiveAdapter: Dispatch<SetStateAction<FileSource | undefined>> = useCallback(
        (value: SetStateAction<FileSource | undefined>) => {
            if (typeof value === 'function') {
                const current = orch?.getSnapshot().activeAdapter
                orch?.setActiveAdapter(value(current))
            } else {
                orch?.setActiveAdapter(value)
            }
        }, [orch],
    )
    const setIsAddingMore: Dispatch<SetStateAction<boolean>> = useCallback(
        (value: SetStateAction<boolean>) => {
            if (typeof value === 'function') {
                const current = orch?.getSnapshot().isAddingMore ?? false
                orch?.setIsAddingMore(value(current))
            } else {
                orch?.setIsAddingMore(value)
            }
        }, [orch],
    )
    const setViewMode: Dispatch<SetStateAction<'grid' | 'list'>> = useCallback(
        (value: SetStateAction<'grid' | 'list'>) => {
            if (typeof value === 'function') {
                const current = orch?.getSnapshot().viewMode ?? 'grid'
                orch?.setViewMode(value(current))
            } else {
                orch?.setViewMode(value)
            }
        }, [orch],
    )

    // ── File operations (delegate to core via useUpupUpload) ────
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

    const handleFileRemove = useCallback((fileId: string) => {
        orch?.removeFile(fileId)
    }, [orch])

    const dynamicUpload = useCallback(async (newFiles: File[] | UploadFile[]) => {
        await upload.setFiles(newFiles as File[])
        return await upload.upload()
    }, [upload])

    const dynamicallyReplaceFiles = useCallback((newFiles: File[] | UploadFile[]) => {
        upload.files.forEach(file => revokeFileUrl(file))
        void upload.setFiles(newFiles as File[])
    }, [upload])

    // ── Upload controls (delegate to orchestrator + core) ───────
    const proceedUpload = useCallback(async () => {
        if (upload.files.length === 0) return undefined
        const prepared = onPrepareFiles ? await onPrepareFiles(upload.files) : upload.files
        if (prepared !== upload.files) {
            await upload.setFiles(prepared as File[])
        }
        return await upload.upload()
    }, [onPrepareFiles, upload])

    const retryUpload = useCallback(async (fileId?: string) => {
        if (upload.files.length === 0) return undefined
        return await upload.retry(fileId)
    }, [upload])

    const handleCancel = useCallback(() => {
        upload.cancel()
        upload.files.forEach(file => revokeFileUrl(file))
        upload.removeAll()
        orch?.handleCancel()
    }, [orch, upload])

    const handlePause = useCallback(() => {
        upload.pause()
    }, [upload])

    const handleResume = useCallback(() => {
        upload.resume()
    }, [upload])

    const handleDone = useCallback(() => {
        onDoneClicked()
        core?.emit('done', {})
        handleCancel()
    }, [core, handleCancel, onDoneClicked])

    const resetState = useCallback(async () => {
        orch?.setIsAddingMore(false)
        core?.emit('state-reset', {})
        handleDone()
    }, [core, handleDone, orch])

    // ── Image editor (delegate to orchestrator) ─────────────────
    const openImageEditor = useCallback((file: UploadFile) => {
        orch?.openImageEditor(file)
    }, [orch])

    const closeImageEditor = useCallback(() => {
        orch?.closeImageEditor()
    }, [orch])

    const saveImageEdit = useCallback((editedImageData: string, mimeType?: string) => {
        orch?.saveImageEdit(editedImageData, mimeType)
    }, [orch])

    const replaceFile = useCallback((fileId: string, newFile: UploadFile) => {
        orch?.replaceFile(fileId, newFile)
    }, [orch])

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Assemble IRootContext ────────────────────────────────────
    return {
        core,
        mode: resolvedMode,
        serverUrl: resolvedServerUrl,
        inputRef,
        openFilePicker,
        activeAdapter: state.activeAdapter,
        setActiveAdapter,
        isAddingMore: state.isAddingMore,
        setIsAddingMore,
        viewMode: state.viewMode,
        setViewMode,
        isOnline: state.isOnline,
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
        files: state.files,
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        editingFile: state.editingFile,
        openImageEditor,
        closeImageEditor,
        saveImageEdit,
        replaceFile,
        oneDriveConfigs,
        googleDriveConfigs,
        dropboxConfigs,
        boxConfigs,
        upload: {
            totalProgress: state.totalProgress,
            filesProgressMap: state.filesProgressMap,
            proceedUpload,
            retryUpload,
            uploadStatus: state.uploadStatus,
            setUploadStatus: () => {},
            uploadError: state.uploadError,
            uploadSpeed: state.uploadSpeed,
            uploadEta: state.uploadEta,
            uploadedBytes: state.uploadedBytes,
            totalBytes: state.totalBytes,
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
