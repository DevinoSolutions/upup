import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import {
    FileSource,
    normalizeRootOptions,
    createRootController,
    type RootControllerOptions,
    type UploadFile,
} from '@upup/core'
import type { Component } from 'svelte'
import type { UploaderProps } from '../shared/types'
import type { IRootContext } from './root-context'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from '../composables/useSSEProcessing'
import { toReadable } from '../lib/to-readable'
import EmptyIcon from '../components/EmptyIcon.svelte'
import TrashIcon from '../components/TrashIcon.svelte'

const EMPTY_STYLE: Record<string, string> = {}

export function createRootProvider(props: UploaderProps): IRootContext {
    // ── Destructure props with defaults ──────────────────────────
    const {
        allowedFileTypes: acceptProp = '*',
        mini = false,
        isProcessing = false,
        allowPreview = true,
        folderUpload,
        showBranding = true,
        disableDragDrop = false,
        className,
        style,
        maxFileSize: maxFileSizeProp,
        maxFiles,
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
        onFileRemoved: onFileRemovedProp,
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

    function onError(message: string) {
        errorHandler?.(message)
    }

    function onWarn(message: string) {
        warningHandler?.(message)
    }

    // ── Build factory-compatible options object ──────────────────
    // UploaderProps.allowedFileTypes is string | string[] | undefined;
    // RootControllerOptions.allowedFileTypes is string | undefined.
    // normalizeRootOptions handles both via join cast.
    const factoryOptions: RootControllerOptions = {
        provider,
        mode: modeProp,
        sources: sources as RootControllerOptions['sources'],
        uploadEndpoint,
        serverUrl,
        maxFiles,
        restrictions,
        theme: props.theme,
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
        minFileSize: props.minFileSize,
        maxTotalFileSize: props.maxTotalFileSize,
        imageEditor: imageEditorProp,
        metadata,
        maxRetries,
        resumable,
        i18n,
        onBeforeFileAdded,
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
        onFileRemoved: onFileRemovedProp,
        onStatusChange,
        onFileTypeMismatch,
        onRestrictionFailed,
    }

    // ── Normalize options (pure) ─────────────────────────────────
    const normalized = normalizeRootOptions(factoryOptions)
    const { resolved } = normalized

    // ── Core (via useUpupUpload; owns core lifecycle) ────────────
    const upload = useUpupUpload(normalized.coreOptions)

    // ── SSE processing ──────────────────────────────────────────
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: (err) => onError(err.message),
        processingTimeout,
    })

    // ── Root controller (created once, owns orchestrator/theme/plugins/commands) ──
    const root = createRootController(
        { core: upload.core, options: factoryOptions, normalized },
        { connectSSE: (file) => connectSSE(file) },
    )
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
        onFileRemove: onFileRemoveProp,
        onFileRemoved: onFileRemovedProp,
        onStatusChange,
        onFileTypeMismatch,
        onRestrictionFailed,
        autoUpload,
    })

    // ── Subscribe to orchestrator state (toReadable handles sub/unsub) ──
    const orchState = toReadable(root.orchestrator)

    // ── Subscribe to theme state (toReadable handles sub/unsub) ──
    const themeState = toReadable(root.theme)

    // ── Lifecycle via factory (idempotent init/dispose) ──────────
    // root.init() owns: orchestrator.init, theme.init, plugin registration,
    //   status-change dedup, crash recovery.
    // root.dispose() owns: orchestrator.destroy, theme.destroy, plugin cleanup.
    // core lifecycle remains owned by useUpupUpload's onDestroy.
    onMount(() => root.init())
    onDestroy(() => root.dispose())

    // ── Input ref: delegate to factory (Svelte bind:this registration) ──────
    // UpupUploader.svelte: $effect(() => ctx.registerFileInput(inputEl))
    // must keep these field names; bodies delegate to root.*.
    const registerFileInput = (el: HTMLInputElement | null) => root.registerFileInput(el)
    const getFileInput = (): HTMLInputElement | null => root.getFileInput()
    const openFilePicker = () => root.openFilePicker()

    // ── Icons resolution (framework-specific) ───────────────────
    const resolvedIcons = {
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon ?? (EmptyIcon as Component),
        FileDeleteIcon: icons.FileDeleteIcon ?? (TrashIcon as Component),
        CameraCaptureIcon: icons.CameraCaptureIcon ?? (EmptyIcon as Component),
        CameraRotateIcon: icons.CameraRotateIcon ?? (EmptyIcon as Component),
        CameraDeleteIcon: icons.CameraDeleteIcon ?? (EmptyIcon as Component),
        LoaderIcon: icons.LoaderIcon ?? (EmptyIcon as Component),
    }

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Assemble IRootContext ────────────────────────────────────
    return {
        core: upload.core,
        orchestrator: root.orchestrator,
        mode: resolved.mode,
        serverUrl: resolved.serverUrl,
        registerFileInput,
        getFileInput,
        openFilePicker,
        // Reactive so consumers (SourceView/MainBox/FileList) re-render when the
        // active adapter changes.
        activeAdapter: derived(orchState, $s => $s.activeAdapter),
        setActiveAdapter: (adapter: FileSource | undefined) => root.commands.setActiveAdapter(adapter),
        isAddingMore: derived(orchState, $s => $s.isAddingMore),
        setIsAddingMore: (v: boolean) => root.commands.setIsAddingMore(v),
        viewMode: derived(orchState, $s => $s.viewMode),
        setViewMode: (m: 'grid' | 'list') => root.commands.setViewMode(m),
        isOnline: derived(orchState, $s => $s.isOnline),
        translations: resolved.translations,
        translator: resolved.translator,
        lang: resolved.lang,
        dir: resolved.dir,
        theme: {
            // All theme fields stay reactive (mirroring React): ThemeStore
            // recomputes tokens/resolved/slotOverrides/slots at init() and on OS
            // dark/light change, so `themeMode:'system'` resolves live instead of
            // freezing the construction-time (light) values.
            themeMode: derived(themeState, $s => $s.themeMode),
            isDark: derived(themeState, $s => $s.isDark),
            tokens: derived(themeState, $s => $s.tokens),
            resolved: derived(themeState, $s => $s.resolved),
            slotOverrides: derived(themeState, $s => $s.slotOverrides),
            slots: derived(themeState, $s => $s.slots),
        },
        files: derived(orchState, $s => $s.files),
        setFiles: (newFiles: File[]) => root.commands.handleSetSelectedFiles(newFiles),
        uploadFiles: (newFiles: File[] | UploadFile[]) => root.commands.uploadFiles(newFiles),
        resetState: () => root.commands.resetState(),
        replaceFiles: (newFiles: File[] | UploadFile[]) => root.commands.replaceFiles(newFiles),
        handleDone: () => root.commands.handleDone(),
        handleCancel: () => root.commands.handleCancel(),
        handlePause: () => root.commands.handlePause(),
        handleResume: () => root.commands.handleResume(),
        handleFileRemove: (fileId: string) => root.commands.handleFileRemove(fileId),
        editingFile: derived(orchState, $s => $s.editingFile),
        openImageEditor: (file: UploadFile) => root.commands.openImageEditor(file),
        closeImageEditor: () => root.commands.closeImageEditor(),
        saveImageEdit: (editedImageData: string, mimeType?: string) => root.commands.saveImageEdit(editedImageData, mimeType),
        replaceFile: (fileId: string, newFile: UploadFile) => root.commands.replaceFile(fileId, newFile),
        oneDriveConfigs: resolved.oneDriveConfigs,
        googleDriveConfigs: resolved.googleDriveConfigs,
        dropboxConfigs: resolved.dropboxConfigs,
        boxConfigs: resolved.boxConfigs,
        upload: {
            totalProgress: derived(orchState, $s => $s.totalProgress),
            filesProgressMap: derived(orchState, $s => $s.filesProgressMap),
            startUpload: () => root.commands.startUpload(),
            retryUpload: (fileId?: string) => root.commands.retryUpload(fileId),
            uploadStatus: derived(orchState, $s => $s.uploadStatus),
            uploadError: derived(orchState, $s => $s.uploadError),
            uploadSpeed: derived(orchState, $s => $s.uploadSpeed),
            uploadEta: derived(orchState, $s => $s.uploadEta),
            uploadedBytes: derived(orchState, $s => $s.uploadedBytes),
            totalBytes: derived(orchState, $s => $s.totalBytes),
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
