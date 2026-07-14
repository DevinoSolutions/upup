import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import { FileSource, type UploadFile } from '@upupjs/core'
import {
    normalizeUploaderOptions,
    createUploaderController,
    type UploaderControllerOptions,
} from '@upupjs/core/internal'
import type { Component } from 'svelte'
import type { UploaderProps } from '../shared/types'
import type { IUploaderContext } from './uploader-context'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from '../composables/useSSEProcessing'
import { toReadable } from '../lib/to-readable'
import EmptyIcon from '../components/EmptyIcon.svelte'
import TrashIcon from '../components/TrashIcon.svelte'

const EMPTY_STYLE: Record<string, string> = {}

export function createUploaderContext(props: UploaderProps): IUploaderContext {
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
    // UploaderControllerOptions.allowedFileTypes is string | undefined.
    // normalizeUploaderOptions handles both via join cast.
    const factoryOptions: UploaderControllerOptions = {
        provider,
        mode: modeProp,
        sources: sources,
        uploadEndpoint,
        serverUrl,
        maxFiles,
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
        allowedFileTypes:
            typeof acceptProp === 'string' ? acceptProp : acceptProp.join(','),
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
        onFileRemoved: onFileRemovedProp,
        onStatusChange,
        onFileTypeMismatch,
        onRestrictionFailed,
    }

    // ── Normalize options (pure) ─────────────────────────────────
    const normalized = normalizeUploaderOptions(factoryOptions)
    const { resolved } = normalized

    // ── Core (via useUpupUpload; owns core lifecycle) ────────────
    const upload = useUpupUpload(normalized.coreOptions)

    // ── SSE processing ──────────────────────────────────────────
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: err => {
            onError(err.message)
        },
        processingTimeout,
    })

    // ── Uploader controller (created once, owns orchestrator/theme/plugins/commands) ──
    const controller = createUploaderController(
        { core: upload.core, options: factoryOptions, normalized },
        {
            connectSSE: file => {
                connectSSE(file)
            },
        },
    )
    controller.updateCallbacks({
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
        onFileRemoved: onFileRemovedProp,
        onStatusChange,
        onFileTypeMismatch,
        onRestrictionFailed,
        autoUpload,
    })

    // ── Subscribe to orchestrator state (toReadable handles sub/unsub) ──
    const orchState = toReadable(controller.orchestrator)

    // ── Subscribe to theme state (toReadable handles sub/unsub) ──
    const themeState = toReadable(controller.theme)

    // ── Lifecycle via factory (idempotent init/destroy) ──────────
    // controller.init() owns: orchestrator.init, theme.init, plugin registration,
    //   status-change dedup, crash recovery.
    // controller.destroy() owns: orchestrator.destroy, theme.destroy, plugin cleanup.
    // core lifecycle remains owned by useUpupUpload's onDestroy.
    onMount(() => {
        controller.init()
    })
    onDestroy(() => {
        controller.destroy()
    })

    // ── Input ref: delegate to factory (Svelte bind:this registration) ──────
    // UpupUploader.svelte: $effect(() => ctx.registerFileInput(inputEl))
    // must keep these field names; bodies delegate to controller.*.
    const registerFileInput = (el: HTMLInputElement | null) => {
        controller.registerFileInput(el)
    }
    const getFileInput = (): HTMLInputElement | null =>
        controller.getFileInput()
    const openFilePicker = () => {
        controller.openFilePicker()
    }

    // ── Icons resolution (framework-specific) ───────────────────
    const resolvedIcons = {
        ContainerAddMoreIcon:
            icons.ContainerAddMoreIcon ?? (EmptyIcon as Component),
        FileDeleteIcon: icons.FileDeleteIcon ?? (TrashIcon as Component),
        CameraCaptureIcon: icons.CameraCaptureIcon ?? (EmptyIcon as Component),
        CameraRotateIcon: icons.CameraRotateIcon ?? (EmptyIcon as Component),
        CameraDeleteIcon: icons.CameraDeleteIcon ?? (EmptyIcon as Component),
        LoaderIcon: icons.LoaderIcon ?? (EmptyIcon as Component),
    }

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Assemble IUploaderContext ────────────────────────────────────
    return {
        core: upload.core,
        orchestrator: controller.orchestrator,
        mode: resolved.mode,
        serverUrl: resolved.serverUrl,
        registerFileInput,
        getFileInput,
        openFilePicker,
        // Reactive so consumers (SourceView/UploaderPanel/FileList) re-render when the
        // active source changes.
        activeSource: derived(orchState, $s => $s.activeSource),
        setActiveSource: (source: FileSource | undefined) => {
            controller.commands.setActiveSource(source)
        },
        isAddingMore: derived(orchState, $s => $s.isAddingMore),
        setIsAddingMore: (v: boolean) => {
            controller.commands.setIsAddingMore(v)
        },
        viewMode: derived(orchState, $s => $s.viewMode),
        setViewMode: (m: 'grid' | 'list') => {
            controller.commands.setViewMode(m)
        },
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
        // ContextFiles.setFiles is fire-and-forget (`=> void`); route the async
        // command's rejection to onError rather than floating the promise.
        setFiles: (newFiles: File[]) => {
            controller.commands
                .handleSetSelectedFiles(newFiles)
                .catch((error: unknown) => {
                    onError(
                        error instanceof Error ? error.message : String(error),
                    )
                })
        },
        uploadFiles: (newFiles: File[] | UploadFile[]) =>
            controller.commands.uploadFiles(newFiles),
        resetState: () => {
            controller.commands.resetState()
        },
        replaceFiles: (newFiles: File[] | UploadFile[]) => {
            controller.commands.replaceFiles(newFiles)
        },
        handleDone: () => {
            controller.commands.handleDone()
        },
        handleCancel: () => {
            controller.commands.handleCancel()
        },
        handlePause: () => {
            controller.commands.handlePause()
        },
        handleResume: () => {
            controller.commands.handleResume()
        },
        handleFileRemove: (fileId: string) => {
            controller.commands.handleFileRemove(fileId)
        },
        editingFile: derived(orchState, $s => $s.editingFile),
        openImageEditor: (file: UploadFile) => {
            controller.commands.openImageEditor(file)
        },
        closeImageEditor: () => {
            controller.commands.closeImageEditor()
        },
        saveImageEdit: (editedImageData: string, mimeType?: string) => {
            controller.commands.saveImageEdit(editedImageData, mimeType)
        },
        replaceFile: (fileId: string, newFile: UploadFile) => {
            controller.commands.replaceFile(fileId, newFile)
        },
        cloudDrives: resolved.cloudDrives,
        upload: {
            totalProgress: derived(orchState, $s => $s.totalProgress),
            filesProgressMap: derived(orchState, $s => $s.filesProgressMap),
            startUpload: () => controller.commands.startUpload(),
            retryUpload: (fileId?: string) =>
                controller.commands.retryUpload(fileId),
            uploadStatus: derived(orchState, $s => $s.uploadStatus),
            uploadError: derived(orchState, $s => $s.uploadError),
            uploadErrorCode: derived(orchState, $s => $s.uploadErrorCode),
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
