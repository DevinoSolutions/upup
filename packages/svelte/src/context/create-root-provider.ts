import { onMount, onDestroy } from 'svelte'
import { derived, get } from 'svelte/store'
import {
    FileSource,
    UploadStatus,
    UploaderOrchestrator,
    ThemeStore,
    createTranslator,
    enUS,
    flattenTranslatorToUiTranslations,
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
    type LocaleBundle,
    type Translator,
    type UploadFile,
} from '@upup/core'
import type { ResolvedImageEditorOptions } from '@upup/core'
import type { Component } from 'svelte'
import type { UpupUploaderProps } from '../shared/types'
import type { IRootContext } from './root-context'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from '../composables/useSSEProcessing'
import { toReadable } from '../lib/to-readable'
import EmptyIcon from '../components/EmptyIcon.svelte'

const EMPTY_STYLE: Record<string, string> = {}

export function createRootProvider(props: UpupUploaderProps): IRootContext {
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

    // ── Resolved props ──────────────────────────────────────────
    const resolvedSources = sources
        ? (sources.map(source => normalizeSource(source)).filter(Boolean) as FileSource[])
        : DEFAULT_SOURCES
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
    const limit = mini ? 1 : Math.max(resolvedLimit, 1)
    const multiple = mini ? false : limit > 1

    const resolvedImageEditor: ResolvedImageEditorOptions = (() => {
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
    })()

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
        imageEditorOptions: resolvedImageEditor,
        autoUpload,
    }

    // Wrap callbacks so they always call the latest ref (mirrors the React/Vue
    // getter proxy pattern for consistency).
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
        get imageEditorOptions() { return resolvedImageEditor },
        get autoUpload() { return callbackRefs.autoUpload },
    }

    // ── Orchestrator (created once, bound to core) ──────────────
    const orch = new UploaderOrchestrator(core, proxiedCallbacks)

    // ── Subscribe to orchestrator state (toReadable handles sub/unsub) ──
    const orchState = toReadable(orch)

    // ── Orchestrator lifecycle ───────────────────────────────────
    onMount(() => {
        orch.init()
    })

    onDestroy(() => {
        orch.destroy()
    })

    // ── Crash recovery ──────────────────────────────────────────
    let crashRecoveryRestored = false
    onMount(() => {
        if (!crashRecovery || crashRecoveryRestored) return
        crashRecoveryRestored = true
        void core.restoreFromCrashRecovery().catch(() => undefined)
    })

    // ── Theme resolution (headless: @upup/core ThemeStore) ──────
    const themeStore = new ThemeStore(themeProp)
    const themeState = toReadable(themeStore)

    onMount(() => {
        themeStore.init()
    })
    onDestroy(() => {
        themeStore.destroy()
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
    const translator: Translator = createTranslator({
        bundle: bundle ?? enUS,
        fallback: fallbackBundle ?? enUS,
        overrides: i18n?.overrides,
    })
    const translations = flattenTranslatorToUiTranslations(translator)
    const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
    const dir = bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)

    // ── Icons resolution (framework-specific) ───────────────────
    const resolvedIcons = {
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon ?? (EmptyIcon as Component),
        FileDeleteIcon: icons.FileDeleteIcon ?? (EmptyIcon as Component),
        CameraCaptureIcon: icons.CameraCaptureIcon ?? (EmptyIcon as Component),
        CameraRotateIcon: icons.CameraRotateIcon ?? (EmptyIcon as Component),
        CameraDeleteIcon: icons.CameraDeleteIcon ?? (EmptyIcon as Component),
        LoaderIcon: icons.LoaderIcon ?? (EmptyIcon as Component),
    }

    // ── Cloud drive configs (framework-specific) ────────────────
    const oneDriveConfigs = cloudDrives?.oneDrive ? {
        onedrive_client_id: cloudDrives.oneDrive.clientId,
        redirectUri: cloudDrives.oneDrive.redirectUri,
    } : undefined
    const googleDriveConfigs = cloudDrives?.googleDrive ? {
        google_client_id: cloudDrives.googleDrive.clientId,
        google_api_key: cloudDrives.googleDrive.apiKey,
        google_app_id: cloudDrives.googleDrive.appId,
    } : undefined
    const dropboxConfigs = cloudDrives?.dropbox ? {
        dropbox_client_id: cloudDrives.dropbox.clientId,
        dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
    } : undefined
    const boxConfigs = cloudDrives?.box ? {
        box_client_id: cloudDrives.box.clientId,
        box_redirect_uri: cloudDrives.box.redirectUri,
    } : undefined

    // ── Plugin registration (cloud drives) ──────────────────────
    let adapterPlugins: Array<{ destroy(): void }> = []

    onMount(() => {
        if (!core) return
        adapterPlugins.forEach(p => p.destroy())
        adapterPlugins = []

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

        adapterPlugins = plugins

        onDestroy(() => {
            adapterPlugins.forEach(p => p.destroy())
            adapterPlugins = []
        })
    })

    // ── Status change callback ──────────────────────────────────
    let lastStatus: UploadStatus | undefined
    onMount(() => {
        const unsub = orch.subscribe(() => {
            const s = orch.getSnapshot().uploadStatus
            if (s && s !== lastStatus) {
                lastStatus = s
                onStatusChange?.(String(s).toLowerCase())
            }
        })
        onDestroy(unsub)
    })

    // ── Input ref (Svelte: bind:this registration) ──────────────
    let inputEl: HTMLInputElement | null = null
    const registerFileInput = (el: HTMLInputElement | null) => { inputEl = el }
    const getFileInput = (): HTMLInputElement | null => inputEl
    const openFilePicker = () => inputEl?.click()

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
        const file = get(orchState).files.get(fileId)
        if (file) revokeFileUrl(file)
        upload.removeFile(fileId)
    }

    async function dynamicUpload(newFiles: File[] | UploadFile[]) {
        await upload.setFiles(newFiles as File[])
        return await upload.upload()
    }

    function dynamicallyReplaceFiles(newFiles: File[] | UploadFile[]) {
        get(upload.files)?.forEach(file => revokeFileUrl(file))
        void upload.setFiles(newFiles as File[])
    }

    // ── Upload controls (delegate to orchestrator + core) ───────
    async function proceedUpload() {
        const current = get(upload.files) ?? []
        if (current.length === 0) return undefined
        const prepared = onPrepareFiles ? await onPrepareFiles(current) : current
        if (prepared !== current) {
            await upload.setFiles(prepared as File[])
        }
        return await upload.upload()
    }

    async function retryUpload(fileId?: string) {
        if ((get(upload.files) ?? []).length === 0) return undefined
        return await upload.retry(fileId)
    }

    function handleCancel() {
        upload.cancel()
        ;(get(upload.files) ?? []).forEach(file => revokeFileUrl(file))
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
        orchestrator: orch,
        mode: resolvedMode,
        serverUrl: resolvedServerUrl,
        registerFileInput,
        getFileInput,
        openFilePicker,
        // Reactive so consumers (AdapterView/MainBox/FileList) re-render when the
        // active adapter changes.
        activeAdapter: derived(orchState, $s => $s.activeAdapter),
        setActiveAdapter: (adapter: FileSource | undefined) => orch.setActiveAdapter(adapter),
        isAddingMore: derived(orchState, $s => $s.isAddingMore),
        setIsAddingMore: (v: boolean) => orch.setIsAddingMore(v),
        viewMode: derived(orchState, $s => $s.viewMode),
        setViewMode: (m: 'grid' | 'list') => orch.setViewMode(m),
        isOnline: derived(orchState, $s => $s.isOnline),
        translations,
        translator,
        lang,
        dir,
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
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        editingFile: derived(orchState, $s => $s.editingFile),
        openImageEditor: (file: UploadFile) => orch.openImageEditor(file),
        closeImageEditor: () => orch.closeImageEditor(),
        saveImageEdit: (editedImageData: string, mimeType?: string) => orch.saveImageEdit(editedImageData, mimeType),
        replaceFile: (fileId: string, newFile: UploadFile) => orch.replaceFile(fileId, newFile),
        oneDriveConfigs,
        googleDriveConfigs,
        dropboxConfigs,
        boxConfigs,
        upload: {
            totalProgress: derived(orchState, $s => $s.totalProgress),
            filesProgressMap: derived(orchState, $s => $s.filesProgressMap),
            proceedUpload,
            retryUpload,
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
