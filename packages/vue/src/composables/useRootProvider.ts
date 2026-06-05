import { ref, shallowRef, computed, watch, onMounted, onUnmounted, defineComponent, type Ref } from 'vue'
import {
    FileSource,
    UploadStatus,
    UploaderOrchestrator,
    createTranslator,
    enUS,
    flattenTranslatorToUiTranslations,
    flattenSlotsToClassNames,
    resolveTheme,
    DropboxPlugin,
    GoogleDrivePlugin,
    BoxPlugin,
    OneDrivePlugin,
    getDir,
    normalizeSource,
    DEFAULT_SOURCES,
    DEFAULT_MAX_FILE_SIZE,
    revokeFileUrl,
    resolveAccept,
    type OrchestratorCallbacks,
    type OrchestratorState,
    type LocaleBundle,
    type Translator,
    type UploadFile,
} from '@upup/core'
import type { ResolvedImageEditorOptions } from '@upup/core'
import type { UpupUploaderProps } from '../shared/types'
import type { IRootContext } from '../context/root-context'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from './useSSEProcessing'

/** Empty component placeholder for icons until Vue SVG icons are added */
const EmptyIcon = defineComponent({ render: () => null })

const EMPTY_THEME_SLOTS = {}
const EMPTY_STYLE: Record<string, string> = {}

export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    // ── Destructure props with defaults ──────────────────────────
    const {
        allowedFileTypes: acceptProp = '*',
        mini = false,
        theme: themeProp,
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

    // ── Resolved props ──────────────────────────────────────────
    const resolvedSources = computed(() =>
        sources
            ? sources.map(source => normalizeSource(source)).filter(Boolean) as FileSource[]
            : DEFAULT_SOURCES,
    )
    const resolvedLimit = maxFiles ?? restrictions?.maxNumberOfFiles ?? 10
    const resolvedMode = modeProp ?? (serverUrl && !uploadEndpoint ? 'server' : 'client')
    const resolvedServerUrl = serverUrl
    const resolvedEndpoint = uploadEndpoint
    const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
    const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
    const maxTotalFileSize = maxTotalFileSizeProp ?? restrictions?.maxTotalFileSize
    const accept = resolveAccept(
        restrictions?.allowedFileTypes ? restrictions.allowedFileTypes.join(',') : acceptProp,
    )
    const folderUploadAllowDrop = folderUpload?.allowDrop ?? false
    const folderPickerButtonVisible = folderUpload?.showSelectFolderButton ?? false
    const limit = computed(() => (mini ? 1 : Math.max(resolvedLimit, 1)))
    const multiple = computed(() => (mini ? false : limit.value > 1))

    const resolvedImageEditor = computed<ResolvedImageEditorOptions>(() => {
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
    })

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

    function onError(message: string) {
        errorHandler?.(message)
    }

    function onWarn(message: string) {
        warningHandler?.(message)
    }

    const upload = useUpupUpload({
        uploadEndpoint: resolvedEndpoint || undefined,
        serverUrl: resolvedServerUrl,
        provider,
        mode: resolvedMode,
        allowedFileTypes: accept,
        limit: limit.value,
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
        onError: (err) => onError(typeof err === 'string' ? err : (err as Error).message),
    })
    const core = upload.core

    // ── SSE processing ──────────────────────────────────────────
    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: (err) => onError(err.message),
        processingTimeout,
    })

    // ── Orchestrator callbacks (always fresh via getter proxy) ───
    const callbackRefs: OrchestratorCallbacks = {
        onError,
        onWarn,
        onUploadStart,
        onFileUploadStart,
        onFileUploadProgress,
        onFilesUploadProgress,
        onFileUploadComplete,
        onFilesUploadComplete: (...args: Parameters<NonNullable<OrchestratorCallbacks['onFilesUploadComplete']>>) => {
            onFilesUploadComplete(...args)
            // SSE connection after upload complete
            const completed = args[0]
            if (Array.isArray(completed)) {
                completed.forEach(file => connectSSE(file))
            }
        },
        onUploadComplete,
        onFilesSelected,
        onDoneClicked,
        onPrepareFiles,
        onFileRemoved: (file: UploadFile) => {
            onFileRemoveProp(file)
            if (onFileRemovedProp && onFileRemovedProp !== onFileRemoveProp) {
                onFileRemovedProp(file)
            }
        },
        imageEditorOptions: resolvedImageEditor.value,
        autoUpload,
    }

    // Wrap callbacks so they always call the latest ref (Vue doesn't
    // have stale closure issues like React, but the getter proxy pattern
    // keeps things consistent with the React rewrite)
    const proxiedCallbacks: OrchestratorCallbacks = {
        get onError() { return callbackRefs.onError },
        get onWarn() { return callbackRefs.onWarn },
        get onUploadStart() { return callbackRefs.onUploadStart },
        get onFileUploadStart() { return callbackRefs.onFileUploadStart },
        get onFileUploadProgress() { return callbackRefs.onFileUploadProgress },
        get onFilesUploadProgress() { return callbackRefs.onFilesUploadProgress },
        get onFileUploadComplete() { return callbackRefs.onFileUploadComplete },
        get onFilesUploadComplete() { return callbackRefs.onFilesUploadComplete },
        get onUploadComplete() { return callbackRefs.onUploadComplete },
        get onFilesSelected() { return callbackRefs.onFilesSelected },
        get onDoneClicked() { return callbackRefs.onDoneClicked },
        get onPrepareFiles() { return callbackRefs.onPrepareFiles },
        get onFileRemoved() { return callbackRefs.onFileRemoved },
        get imageEditorOptions() { return resolvedImageEditor.value },
        get autoUpload() { return callbackRefs.autoUpload },
    }

    // ── Orchestrator (created once, bound to core) ──────────────
    const orch = new UploaderOrchestrator(core, proxiedCallbacks)

    // ── Subscribe to orchestrator state (Vue pattern) ───────────
    const state = shallowRef<OrchestratorState>(orch.getSnapshot())
    const unsub = orch.subscribe(() => {
        state.value = orch.getSnapshot()
    })

    // ── Orchestrator lifecycle ───────────────────────────────────
    onMounted(() => {
        orch.init()
    })

    onUnmounted(() => {
        orch.destroy()
        unsub()
    })

    // ── Crash recovery ──────────────────────────────────────────
    let crashRecoveryRestored = false
    onMounted(() => {
        if (!crashRecovery || crashRecoveryRestored) return
        crashRecoveryRestored = true
        void core.restoreFromCrashRecovery().catch(() => undefined)
    })

    // ── Theme resolution (framework-specific) ───────────────────
    const requestedThemeMode = themeProp?.mode ?? 'light'
    const systemMode = ref<'light' | 'dark'>('light')

    const themeMode = computed<'light' | 'dark'>(() => {
        if (requestedThemeMode === 'system') return systemMode.value
        return requestedThemeMode
    })

    const resolvedTheme = computed(() =>
        resolveTheme({ ...(themeProp ?? {}), mode: themeMode.value }),
    )
    const themeSlots = computed(() => resolvedTheme.value.slots)
    const resolvedSlotClasses = computed(() => flattenSlotsToClassNames(themeSlots.value))

    onMounted(() => {
        if (requestedThemeMode !== 'system') return
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const update = () => { systemMode.value = media.matches ? 'dark' : 'light' }
        update()
        media.addEventListener?.('change', update)

        onUnmounted(() => media.removeEventListener?.('change', update))
    })

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
    const translator = computed<Translator>(() =>
        createTranslator({
            bundle: bundle ?? enUS,
            fallback: fallbackBundle ?? enUS,
            overrides: i18n?.overrides,
        }),
    )
    const translations = computed(() =>
        flattenTranslatorToUiTranslations(translator.value),
    )
    const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
    const dir = bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)

    // ── Icons resolution (framework-specific) ───────────────────
    const resolvedIcons = computed(() => ({
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon ?? EmptyIcon,
        FileDeleteIcon: icons.FileDeleteIcon ?? EmptyIcon,
        CameraCaptureIcon: icons.CameraCaptureIcon ?? EmptyIcon,
        CameraRotateIcon: icons.CameraRotateIcon ?? EmptyIcon,
        CameraDeleteIcon: icons.CameraDeleteIcon ?? EmptyIcon,
        LoaderIcon: icons.LoaderIcon ?? EmptyIcon,
    }))

    // ── Cloud drive configs (framework-specific) ────────────────
    const oneDriveConfigs = computed(() => cloudDrives?.oneDrive ? {
        onedrive_client_id: cloudDrives.oneDrive.clientId,
        redirectUri: cloudDrives.oneDrive.redirectUri,
    } : undefined)
    const googleDriveConfigs = computed(() => cloudDrives?.googleDrive ? {
        google_client_id: cloudDrives.googleDrive.clientId,
        google_api_key: cloudDrives.googleDrive.apiKey,
        google_app_id: cloudDrives.googleDrive.appId,
    } : undefined)
    const dropboxConfigs = computed(() => cloudDrives?.dropbox ? {
        dropbox_client_id: cloudDrives.dropbox.clientId,
        dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
    } : undefined)
    const boxConfigs = computed(() => cloudDrives?.box ? {
        box_client_id: cloudDrives.box.clientId,
        box_redirect_uri: cloudDrives.box.redirectUri,
    } : undefined)

    // ── Plugin registration (cloud drives) ──────────────────────
    let adapterPlugins: Array<{ destroy(): void }> = []

    onMounted(() => {
        if (!core) return
        adapterPlugins.forEach(p => p.destroy())
        adapterPlugins = []

        const plugins: Array<{ destroy(): void }> = []

        if (googleDriveConfigs.value) {
            const plugin = new GoogleDrivePlugin()
            plugin.configure(googleDriveConfigs.value)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }
        if (dropboxConfigs.value) {
            const plugin = new DropboxPlugin()
            plugin.configure(dropboxConfigs.value)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }
        if (boxConfigs.value) {
            const plugin = new BoxPlugin()
            plugin.configure(boxConfigs.value)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }
        if (oneDriveConfigs.value) {
            const plugin = new OneDrivePlugin()
            plugin.configure(oneDriveConfigs.value)
            try { core.use(plugin) } catch { /* already registered */ }
            plugins.push(plugin)
        }

        adapterPlugins = plugins

        onUnmounted(() => {
            adapterPlugins.forEach(p => p.destroy())
            adapterPlugins = []
        })
    })

    // ── Status change callback ──────────────────────────────────
    watch(() => state.value.uploadStatus, (newStatus) => {
        if (newStatus) onStatusChange?.(newStatus.toLowerCase())
    })

    // ── Input ref (Vue-specific) ────────────────────────────────
    const inputRef: Ref<HTMLInputElement | null> = ref(null)
    function openFilePicker() {
        inputRef.value?.click()
    }

    // ── File operations (delegate to core via useUpupUpload) ────
    async function handleSetSelectedFiles(newFiles: File[]) {
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
    }

    function handleFileRemove(fileId: string) {
        const file = state.value.files.get(fileId)
        if (file) revokeFileUrl(file)
        upload.removeFile(fileId)
    }

    async function dynamicUpload(newFiles: File[] | UploadFile[]) {
        await upload.setFiles(newFiles as File[])
        return await upload.upload()
    }

    function dynamicallyReplaceFiles(newFiles: File[] | UploadFile[]) {
        upload.files.value?.forEach(file => revokeFileUrl(file))
        void upload.setFiles(newFiles as File[])
    }

    // ── Upload controls (delegate to orchestrator + core) ───────
    async function proceedUpload() {
        if ((upload.files.value ?? []).length === 0) return undefined
        const prepared = onPrepareFiles ? await onPrepareFiles(upload.files.value ?? []) : (upload.files.value ?? [])
        if (prepared !== (upload.files.value ?? [])) {
            await upload.setFiles(prepared as File[])
        }
        return await upload.upload()
    }

    async function retryUpload(fileId?: string) {
        if ((upload.files.value ?? []).length === 0) return undefined
        return await upload.retry(fileId)
    }

    function handleCancel() {
        upload.cancel()
        ;(upload.files.value ?? []).forEach(file => revokeFileUrl(file))
        upload.removeAll()
        orch.handleCancel()
    }

    function handlePause() {
        upload.pause()
    }

    function handleResume() {
        upload.resume()
    }

    function handleDone() {
        onDoneClicked()
        core?.emit('done', {})
        handleCancel()
    }

    function resetState() {
        orch.setIsAddingMore(false)
        core?.emit('state-reset', {})
        handleDone()
    }

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Assemble IRootContext ────────────────────────────────────
    return {
        core,
        mode: resolvedMode,
        serverUrl: resolvedServerUrl,
        inputRef,
        openFilePicker,
        // Reactive so consumers (AdapterView/MainBox/FileList) re-render when the
        // active adapter changes. A plain `state.value.activeAdapter` snapshot here
        // froze it at undefined, so clicking a cloud-drive tile never opened its view.
        activeAdapter: computed(() => state.value.activeAdapter),
        setActiveAdapter: (adapter: FileSource | undefined) => orch.setActiveAdapter(adapter),
        isAddingMore: state.value.isAddingMore,
        setIsAddingMore: (v: boolean) => orch.setIsAddingMore(v),
        viewMode: state.value.viewMode,
        setViewMode: (m: 'grid' | 'list') => orch.setViewMode(m),
        isOnline: state.value.isOnline,
        translations: translations.value,
        translator: translator.value,
        lang,
        dir,
        theme: {
            themeMode: themeMode.value,
            isDark: themeMode.value === 'dark',
            tokens: resolvedTheme.value.tokens,
            resolved: resolvedTheme.value as typeof resolvedTheme.value & { mode: 'light' | 'dark' },
            slotOverrides: resolvedSlotClasses.value,
            slots: themeSlots.value ?? EMPTY_THEME_SLOTS,
        },
        files: state.value.files,
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        editingFile: state.value.editingFile,
        openImageEditor: (file: UploadFile) => orch.openImageEditor(file),
        closeImageEditor: () => orch.closeImageEditor(),
        saveImageEdit: (editedImageData: string, mimeType?: string) => orch.saveImageEdit(editedImageData, mimeType),
        replaceFile: (fileId: string, newFile: UploadFile) => orch.replaceFile(fileId, newFile),
        oneDriveConfigs: oneDriveConfigs.value,
        googleDriveConfigs: googleDriveConfigs.value,
        dropboxConfigs: dropboxConfigs.value,
        boxConfigs: boxConfigs.value,
        upload: {
            totalProgress: state.value.totalProgress,
            filesProgressMap: state.value.filesProgressMap,
            proceedUpload,
            retryUpload,
            uploadStatus: state.value.uploadStatus,
            uploadError: state.value.uploadError,
            uploadSpeed: state.value.uploadSpeed,
            uploadEta: state.value.uploadEta,
            uploadedBytes: state.value.uploadedBytes,
            totalBytes: state.value.totalBytes,
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
            sources: resolvedSources.value,
            allowedFileTypes: accept,
            maxFileSize,
            limit: limit.value,
            isProcessing,
            allowPreview,
            folderUploadAllowDrop,
            folderPickerButtonVisible,
            showBranding,
            disableDragDrop,
            className: className ?? '',
            style: resolvedStyle,
            multiple: multiple.value,
            icons: resolvedIcons.value,
            imageEditor: resolvedImageEditor.value,
        },
    }
}
