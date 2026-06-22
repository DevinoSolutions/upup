
import { Dispatch, SetStateAction, createElement, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import {
    FileSource,
    UploadStatus,
    normalizeRootOptions,
    createRootController,
    resolveTheme,
    flattenSlotsToClassNames,
    type RootController,
    type RootControllerOptions,
    type OrchestratorState,
    type ThemeStoreState,
    type UploadFile,
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
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from './useSSEProcessing'

/** Default loader icon — renders the registry 'loader' glyph via the shared Icon renderer
 *  (which applies the stroke attrs, so the glyph is visible). Forwards size/class like the
 *  former react-icons default did. */
const DefaultLoaderIconComponent = (props: { size?: number; className?: string }) =>
    createElement(Icon, { name: 'loader', ...props })

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

/** Stable SSR snapshot for theme (useSyncExternalStore third arg for ThemeStore).
 *  Computed once at module load — pure, SSR-safe (no matchMedia). */
const THEME_SERVER_SNAPSHOT: ThemeStoreState = (() => {
    const resolved = resolveTheme({ mode: 'light' }) as ThemeStoreState['resolved']
    return {
        themeMode: 'light' as const,
        isDark: false,
        tokens: resolved.tokens,
        resolved,
        slotOverrides: flattenSlotsToClassNames(resolved.slots),
        slots: resolved.slots ?? {},
    }
})()

export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    const {
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
    } = props

    const onError = useCallback((message: string) => {
        errorHandler?.(message)
    }, [errorHandler])
    const onWarn = useCallback((message: string) => {
        warningHandler?.(message)
    }, [warningHandler])

    // ── Build factory-compatible options object ──────────────────
    // UpupUploaderProps.allowedFileTypes is string | string[] | undefined;
    // RootControllerOptions.allowedFileTypes is string | undefined.
    // normalizeRootOptions handles both at runtime via a cast, so we cast here.
    const factoryOptions = useMemo<RootControllerOptions>(() => ({
        provider,
        mode: modeProp,
        sources: sources as RootControllerOptions['sources'],
        uploadEndpoint,
        serverUrl,
        maxFiles,
        restrictions,
        theme,
        folderUpload,
        cors,
        cloudDrives,
        imageCompression,
        thumbnailGenerator,
        checksumVerification,
        webWorker,
        heicConversion,
        stripExifData,
        contentDeduplication,
        autoUpload,
        maxConcurrentUploads,
        crashRecovery,
        allowedFileTypes: (typeof acceptProp === 'string' ? acceptProp : (acceptProp as string[]).join(',')) as string | undefined,
        mini,
        isProcessing,
        allowPreview,
        showBranding,
        disableDragDrop,
        className,
        maxFileSize: maxFileSizeProp,
        minFileSize: minFileSizeProp,
        maxTotalFileSize: maxTotalFileSizeProp,
        imageEditor: imageEditorProp,
        metadata,
        maxRetries,
        resumable,
        i18n,
        onBeforeFileAdded,
        // Callbacks: set to current stable refs; updated live via root.updateCallbacks() each render
        onError: errorHandler,
        onWarn: warningHandler,
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
        onFileRemove: onFileRemoveProp,
        onFileRemoved,
        onStatusChange,
        onFileTypeMismatch,
        onRestrictionFailed,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [props])  // props identity memoization — same as normalizeRootOptions below

    // ── Normalize options (pure; memoized on props identity) ─────
    const normalized = useMemo(() => normalizeRootOptions(factoryOptions), [factoryOptions])
    const { resolved } = normalized

    // ── Core (via useUpupUpload; owns core lifecycle) ────────────
    const upload = useUpupUpload(normalized.coreOptions)
    const core = upload.core

    // ── SSE processing ──────────────────────────────────────────
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: (err) => onError(err.message),
        processingTimeout,
    })

    // Keep connectSSERef fresh every render (factory proxy reads via closure)
    const connectSSERef = useRef(connectSSE)
    connectSSERef.current = connectSSE

    // ── Root controller (created once, guarded ref) ──────────────
    const rootRef = useRef<RootController | null>(null)
    if (!rootRef.current && core) {
        rootRef.current = createRootController(
            { core, options: factoryOptions, normalized },
            { connectSSE: (file) => connectSSERef.current(file) },
        )
    }
    const root = rootRef.current!

    // Refresh proxied callbacks every render (replaces old callbackRefs.current overwrite).
    // Must call before any render-path reads from the proxy.
    if (root) {
        root.updateCallbacks({
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
            // Map React's dual onFileRemove/onFileRemoved props into factory's callback slots
            onFileRemove: onFileRemoveProp,
            onFileRemoved,
            onStatusChange,
            onFileTypeMismatch,
            onRestrictionFailed,
            autoUpload,
        })
    }

    // ── Subscribe to orchestrator state (React 18 useSyncExternalStore) ──
    const getServerSnapshot = useCallback(() => SERVER_SNAPSHOT, [])
    const state = useSyncExternalStore(
        root?.orchestrator.subscribe ?? (() => () => {}),
        root?.orchestrator.getSnapshot ?? (() => SERVER_SNAPSHOT),
        getServerSnapshot,
    )

    // ── Subscribe to theme state (ThemeStore → replaces useResolvedThemeMode) ──
    // ThemeStore.init() owns the same matchMedia('prefers-color-scheme: dark') subscription
    // as the old useResolvedThemeMode, so light/dark/system resolve identically.
    // ThemeStoreState fields (themeMode, isDark, tokens, resolved, slotOverrides, slots)
    // map 1:1 to ContextTheme — no field renaming needed.
    const getThemeServerSnapshot = useCallback(() => THEME_SERVER_SNAPSHOT, [])
    const themeState = useSyncExternalStore(
        root?.theme.subscribe ?? (() => () => {}),
        root?.theme.getSnapshot ?? (() => THEME_SERVER_SNAPSHOT),
        getThemeServerSnapshot,
    )

    // ── Single lifecycle effect (replaces 4 old effects) ─────────
    // init()/dispose() are idempotent + re-entrant; safe for React 18/19 StrictMode double-mount.
    //
    // StrictMode/plugin behavior: factory dispose() calls p.destroy() on each plugin,
    // which is IDENTICAL to the old React adapter's plugin-effect cleanup:
    //   return () => { plugins.forEach(p => p.destroy()) }
    // So after StrictMode init→dispose→init on the same core, cloud plugins could be dead.
    // This is NOT a regression — the original React adapter had the same behavior.
    useEffect(() => {
        root?.init()
        return () => root?.dispose()
    }, [root])

    // ── Input ref (React-specific) ──────────────────────────────
    const inputRef = useRef<HTMLInputElement>(null)
    const openFilePicker = useCallback(() => {
        inputRef.current?.click()
    }, [])

    // ── Commands (delegate to factory commands) ──────────────────
    const handleSetSelectedFiles = useCallback(async (newFiles: File[]) => {
        return root?.commands.handleSetSelectedFiles(newFiles)
    }, [root])

    const handleFileRemove = useCallback((fileId: string) => {
        root?.commands.handleFileRemove(fileId)
    }, [root])

    const dynamicUpload = useCallback(async (newFiles: File[] | UploadFile[]) => {
        return root?.commands.dynamicUpload(newFiles)
    }, [root])

    const dynamicallyReplaceFiles = useCallback((newFiles: File[] | UploadFile[]) => {
        root?.commands.dynamicallyReplaceFiles(newFiles)
    }, [root])

    const proceedUpload = useCallback(async () => {
        return root?.commands.proceedUpload()
    }, [root])

    const retryUpload = useCallback(async (fileId?: string) => {
        return root?.commands.retryUpload(fileId)
    }, [root])

    const handleCancel = useCallback(() => {
        root?.commands.handleCancel()
    }, [root])

    const handlePause = useCallback(() => {
        root?.commands.handlePause()
    }, [root])

    const handleResume = useCallback(() => {
        root?.commands.handleResume()
    }, [root])

    const handleDone = useCallback(() => {
        root?.commands.handleDone()
    }, [root])

    const resetState = useCallback(() => {
        root?.commands.resetState()
    }, [root])

    const openImageEditor = useCallback((file: UploadFile) => {
        root?.commands.openImageEditor(file)
    }, [root])

    const closeImageEditor = useCallback(() => {
        root?.commands.closeImageEditor()
    }, [root])

    const saveImageEdit = useCallback((editedImageData: string, mimeType?: string) => {
        root?.commands.saveImageEdit(editedImageData, mimeType)
    }, [root])

    const replaceFile = useCallback((fileId: string, newFile: UploadFile) => {
        root?.commands.replaceFile(fileId, newFile)
    }, [root])

    // ── Dispatch<SetStateAction> setters (preserve functional-update branch) ──
    const setActiveAdapter: Dispatch<SetStateAction<FileSource | undefined>> = useCallback(
        (value: SetStateAction<FileSource | undefined>) => {
            if (typeof value === 'function') {
                root?.commands.setActiveAdapter(value(root.orchestrator.getSnapshot().activeAdapter))
            } else {
                root?.commands.setActiveAdapter(value)
            }
        }, [root],
    )
    const setIsAddingMore: Dispatch<SetStateAction<boolean>> = useCallback(
        (value: SetStateAction<boolean>) => {
            if (typeof value === 'function') {
                root?.commands.setIsAddingMore(value(root.orchestrator.getSnapshot().isAddingMore ?? false))
            } else {
                root?.commands.setIsAddingMore(value)
            }
        }, [root],
    )
    const setViewMode: Dispatch<SetStateAction<'grid' | 'list'>> = useCallback(
        (value: SetStateAction<'grid' | 'list'>) => {
            if (typeof value === 'function') {
                root?.commands.setViewMode(value(root.orchestrator.getSnapshot().viewMode ?? 'grid'))
            } else {
                root?.commands.setViewMode(value)
            }
        }, [root],
    )

    // ── Icons resolution (React-specific) ───────────────────────
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

    // ── Cloud drive configs (from resolved — unchanged shape) ────
    const { oneDriveConfigs, googleDriveConfigs, dropboxConfigs, boxConfigs } = resolved

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Assemble IRootContext ────────────────────────────────────
    // themeState fields match ContextTheme 1:1 (ThemeStoreState ≡ ContextTheme shape)
    return {
        core,
        orchestrator: root?.orchestrator,
        mode: resolved.mode,
        serverUrl: resolved.serverUrl,
        inputRef,
        openFilePicker,
        activeAdapter: state.activeAdapter,
        setActiveAdapter,
        isAddingMore: state.isAddingMore,
        setIsAddingMore,
        viewMode: state.viewMode,
        setViewMode,
        isOnline: state.isOnline,
        translations: resolved.translations,
        translator: resolved.translator,
        lang: resolved.lang,
        dir: resolved.dir,
        theme: {
            themeMode: themeState.themeMode,
            isDark: themeState.isDark,
            tokens: themeState.tokens,
            resolved: themeState.resolved,
            slotOverrides: themeState.slotOverrides,
            slots: themeState.slots ?? EMPTY_THEME_SLOTS,
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
            sources: resolved.sources,
            allowedFileTypes: resolved.allowedFileTypes,
            maxFileSize: resolved.maxFileSize,
            limit: resolved.limit,
            isProcessing,
            allowPreview,
            folderUploadAllowDrop: resolved.folderUploadAllowDrop,
            folderPickerButtonVisible: resolved.folderPickerButtonVisible,
            showBranding,
            disableDragDrop,
            className: className ?? '',
            style: resolvedStyle,
            multiple: resolved.multiple,
            icons: resolvedIcons,
            imageEditor: resolved.imageEditor,
        },
    }
}
