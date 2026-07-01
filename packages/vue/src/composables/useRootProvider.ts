import { ref, shallowRef, computed, onMounted, onUnmounted, defineComponent, h, type Ref } from 'vue'
import {
    FileSource,
    normalizeRootOptions,
    createRootController,
    type OrchestratorState,
    type RootControllerOptions,
    type UploadFile,
} from '@upup/core'
import type { UploaderProps } from '../shared/types'
import type { IRootContext } from '../context/root-context'
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
    setup: (_props, { attrs }) => () =>
        h(Icon, {
            name: 'trash',
            class: attrs.class as string | undefined,
            size: attrs.size as number | undefined,
        }),
})

const EMPTY_STYLE: Record<string, string> = {}

export default function useRootProvider(props: UploaderProps): IRootContext {
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
    // normalizeRootOptions handles both at runtime via the join cast.
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
    const core = upload.core

    // ── SSE processing ──────────────────────────────────────────
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: (err) => onError(err.message),
        processingTimeout,
    })

    // ── Root controller (created once, owns orchestrator/theme/plugins/commands) ──
    const root = createRootController(
        { core, options: factoryOptions, normalized },
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

    // ── Subscribe to orchestrator state (Vue pattern: shallowRef + subscribe) ─
    const state = shallowRef<OrchestratorState>(root.orchestrator.getSnapshot())
    const unsub = root.orchestrator.subscribe(() => {
        state.value = root.orchestrator.getSnapshot()
    })

    // ── Subscribe to theme state (Vue pattern: shallowRef + subscribe) ────────
    const themeState = shallowRef(root.theme.getSnapshot())
    let unsubTheme: (() => void) | null = null

    onMounted(() => {
        unsubTheme = root.theme.subscribe(() => {
            themeState.value = root.theme.getSnapshot()
        })
    })
    onUnmounted(() => {
        unsubTheme?.()
    })

    // ── Lifecycle via factory (idempotent init/dispose) ──────────
    // root.init() owns: orchestrator.init, theme.init, plugin registration,
    //   status-change dedup, crash recovery.
    // root.dispose() owns: orchestrator.destroy, theme.destroy, plugin cleanup.
    // core lifecycle remains owned by useUpupUpload's onUnmounted.
    onMounted(() => root.init())
    onUnmounted(() => {
        root.dispose()
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

    // ── Assemble IRootContext ────────────────────────────────────
    return {
        core,
        orchestrator: root.orchestrator,
        mode: resolved.mode,
        serverUrl: resolved.serverUrl,
        inputRef,
        openFilePicker,
        // Reactive so consumers re-render when the active adapter changes.
        activeAdapter: computed(() => state.value.activeAdapter),
        setActiveAdapter: (adapter: FileSource | undefined) => root.commands.setActiveAdapter(adapter),
        isAddingMore: computed(() => state.value.isAddingMore),
        setIsAddingMore: (v: boolean) => root.commands.setIsAddingMore(v),
        viewMode: computed(() => state.value.viewMode),
        setViewMode: (m: 'grid' | 'list') => root.commands.setViewMode(m),
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
        setFiles: async (newFiles: File[]) => root.commands.handleSetSelectedFiles(newFiles),
        dynamicUpload: async (newFiles: File[] | UploadFile[]) => root.commands.dynamicUpload(newFiles),
        resetState: () => root.commands.resetState(),
        dynamicallyReplaceFiles: (newFiles: File[] | UploadFile[]) => root.commands.dynamicallyReplaceFiles(newFiles),
        handleDone: () => root.commands.handleDone(),
        handleCancel: () => root.commands.handleCancel(),
        handlePause: () => root.commands.handlePause(),
        handleResume: () => root.commands.handleResume(),
        handleFileRemove: (fileId: string) => root.commands.handleFileRemove(fileId),
        editingFile: computed(() => state.value.editingFile),
        openImageEditor: (file: UploadFile) => root.commands.openImageEditor(file),
        closeImageEditor: () => root.commands.closeImageEditor(),
        saveImageEdit: (editedImageData: string, mimeType?: string) => root.commands.saveImageEdit(editedImageData, mimeType),
        replaceFile: (fileId: string, newFile: UploadFile) => root.commands.replaceFile(fileId, newFile),
        oneDriveConfigs: resolved.oneDriveConfigs,
        googleDriveConfigs: resolved.googleDriveConfigs,
        dropboxConfigs: resolved.dropboxConfigs,
        boxConfigs: resolved.boxConfigs,
        upload: {
            totalProgress: computed(() => state.value.totalProgress),
            filesProgressMap: computed(() => state.value.filesProgressMap),
            proceedUpload: () => root.commands.proceedUpload(),
            retryUpload: (fileId?: string) => root.commands.retryUpload(fileId),
            uploadStatus: computed(() => state.value.uploadStatus),
            uploadError: computed(() => state.value.uploadError),
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
