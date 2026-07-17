import {
    ref,
    shallowRef,
    computed,
    watch,
    onMounted,
    onUnmounted,
    defineComponent,
    h,
    type Ref,
} from 'vue'
import { FileSource, type UploadFile } from '@upupjs/core'
import {
    normalizeUploaderOptions,
    createUploaderController,
    type OrchestratorState,
    type UploaderControllerOptions,
} from '@upupjs/core/internal'
import type { UploaderProps } from '../shared/types'
import type { IUploaderContext } from '../context/uploader-context'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from './useSSEProcessing'
import { Icon } from '../components/Icon'

/** Empty component placeholder for icons that have no real default glyph yet. */
const EmptyIcon = defineComponent({ render: () => null })

/** Default file-delete glyph — renders the shared registry 'trash' icon (parity with
 *  React's react-icons TbTrash default). Forwards the consumer's class/attrs to the svg. */
const DefaultFileDeleteIcon = defineComponent({
    name: 'UpupDefaultFileDeleteIcon',
    inheritAttrs: false,
    // attrs is Record<string, unknown> (SetupContext); narrow the two props Icon accepts.
    setup:
        (_props, { attrs }) =>
        () =>
            h(Icon, {
                name: 'trash',
                class: attrs.class as string | undefined,
                size: attrs.size as number | undefined,
            }),
})

const EMPTY_STYLE: Record<string, string> = {}

export default function useUploaderController(
    props: UploaderProps,
): IUploaderContext {
    // ── Destructure props with defaults ──────────────────────────
    const {
        allowedFileTypes: acceptProp = '*',
        mini = false,
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
    // normalizeUploaderOptions handles both at runtime via the join cast.
    const factoryOptions: UploaderControllerOptions = {
        provider,
        mode: modeProp,
        sources,
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
        minFileSize: minFileSizeProp,
        maxTotalFileSize: maxTotalFileSizeProp,
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
    const core = upload.core

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
        { core, options: factoryOptions, normalized },
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

    // ── Subscribe to orchestrator state (Vue pattern: shallowRef + subscribe) ─
    const state = shallowRef<OrchestratorState>(
        controller.orchestrator.getSnapshot(),
    )
    const unsub = controller.orchestrator.subscribe(() => {
        state.value = controller.orchestrator.getSnapshot()
    })

    // ── Subscribe to theme state (Vue pattern: shallowRef + subscribe) ────────
    const themeState = shallowRef(controller.theme.getSnapshot())
    let unsubTheme: (() => void) | null = null

    onMounted(() => {
        unsubTheme = controller.theme.subscribe(() => {
            themeState.value = controller.theme.getSnapshot()
        })
    })
    onUnmounted(() => {
        unsubTheme?.()
    })

    // ── Re-resolve on theme-prop change (post-mount) ─────────────
    // The controller (hence its ThemeStore) is created once, so a `theme` prop
    // change after mount would otherwise never reach the live store. ThemeStore
    // short-circuits structurally-equal configs, so an inlined object literal
    // (e.g. :theme="{ mode: 'dark' }") per render costs nothing.
    watch(
        () => props.theme,
        theme => {
            controller.theme.setThemeConfig(theme)
        },
    )

    // ── Lifecycle via factory (idempotent init/destroy) ──────────
    // controller.init() owns: orchestrator.init, theme.init, plugin registration,
    //   status-change dedup, crash recovery.
    // controller.destroy() owns: orchestrator.destroy, theme.destroy, plugin cleanup.
    // core lifecycle remains owned by useUpupUpload's onUnmounted.
    onMounted(() => {
        controller.init()
    })
    onUnmounted(() => {
        controller.destroy()
        unsub()
    })

    // ── Input ref (Vue-specific) ────────────────────────────────
    const inputRef: Ref<HTMLInputElement | null> = ref(null)
    // Vue drives the picker via its reactive inputRef; the factory's imperative
    // registerFileInput/openFilePicker path is unused here (no DOM node registered).
    function openFilePicker() {
        inputRef.value?.click()
    }

    // ── Icons resolution (framework-specific; Vue uses EmptyIcon stubs) ──────
    const resolvedIcons = computed(() => ({
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon ?? EmptyIcon,
        FileDeleteIcon: icons.FileDeleteIcon ?? DefaultFileDeleteIcon,
        CameraCaptureIcon: icons.CameraCaptureIcon ?? EmptyIcon,
        CameraRotateIcon: icons.CameraRotateIcon ?? EmptyIcon,
        CameraDeleteIcon: icons.CameraDeleteIcon ?? EmptyIcon,
        LoaderIcon: icons.LoaderIcon ?? EmptyIcon,
    }))

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Assemble IUploaderContext ────────────────────────────────────
    return {
        core,
        orchestrator: controller.orchestrator,
        mode: resolved.mode,
        serverUrl: resolved.serverUrl,
        inputRef,
        openFilePicker,
        // Reactive so consumers re-render when the active source changes.
        activeSource: computed(() => state.value.activeSource),
        setActiveSource: (source: FileSource | undefined) => {
            controller.commands.setActiveSource(source)
        },
        isAddingMore: computed(() => state.value.isAddingMore),
        setIsAddingMore: (v: boolean) => {
            controller.commands.setIsAddingMore(v)
        },
        viewMode: computed(() => state.value.viewMode),
        setViewMode: (m: 'grid' | 'list') => {
            controller.commands.setViewMode(m)
        },
        isOnline: computed(() => state.value.isOnline),
        translations: resolved.translations,
        translator: resolved.translator,
        lang: resolved.lang,
        dir: resolved.dir,
        theme: {
            // themeMode/isDark stay reactive so `themeMode:'system'` resolves live;
            // tokens/resolved/slotOverrides remain provide-time snapshots (unchanged
            // contract). The resolution lives in core's ThemeStore.
            themeMode: computed(() => themeState.value.themeMode),
            isDark: computed(() => themeState.value.isDark),
            tokens: themeState.value.tokens,
            resolved: themeState.value.resolved,
            slotOverrides: themeState.value.slotOverrides,
            slots: themeState.value.slots,
        },
        files: computed(() => state.value.files),
        // handleSetSelectedFiles self-handles addFiles errors and never rejects;
        // route any unexpected rejection to onError to honor the void contract.
        setFiles: (newFiles: File[]) => {
            controller.commands
                .handleSetSelectedFiles(newFiles)
                .catch((err: unknown) => {
                    onError(err instanceof Error ? err.message : String(err))
                })
        },
        uploadFiles: async (newFiles: File[] | UploadFile[]) =>
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
        editingFile: computed(() => state.value.editingFile),
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
            totalProgress: computed(() => state.value.totalProgress),
            filesProgressMap: computed(() => state.value.filesProgressMap),
            startUpload: () => controller.commands.startUpload(),
            retryUpload: (fileId?: string) =>
                controller.commands.retryUpload(fileId),
            uploadStatus: computed(() => state.value.uploadStatus),
            uploadError: computed(() => state.value.uploadError),
            uploadErrorCode: computed(() => state.value.uploadErrorCode),
            uploadSpeed: computed(() => state.value.uploadSpeed),
            uploadEta: computed(() => state.value.uploadEta),
            uploadedBytes: computed(() => state.value.uploadedBytes),
            totalBytes: computed(() => state.value.totalBytes),
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
            icons: resolvedIcons.value,
            imageEditor: resolved.imageEditor,
        },
    }
}
