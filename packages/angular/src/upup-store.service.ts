import { Injectable, computed, signal, type Signal } from '@angular/core'
import {
    FileSource,
    UploadStatus,
    UploaderOrchestrator,
    ThemeStore,
    createTranslator,
    enUS,
    flattenTranslatorToUiTranslations,
    GoogleDrivePlugin,
    DropboxPlugin,
    BoxPlugin,
    OneDrivePlugin,
    getDir,
    normalizeSource,
    DEFAULT_SOURCES,
    DEFAULT_MAX_FILE_SIZE,
    resolveAccept,
    revokeFileUrl,
    type OrchestratorCallbacks,
    type LocaleBundle,
    type Translator,
    type UploadFile,
    type ResolvedImageEditorOptions,
    type UiTranslations,
} from '@upup/core'
import { createUpupUpload, type UpupUploadHandle } from './lib/use-upup-upload'
import { createSSEProcessing } from './lib/use-sse-processing'
import { toSignalStore, type SignalStore } from './lib/to-signal-store'
import type { UpupUploaderProps } from './shared/types'
import { EmptyIconComponent } from './components/icons/empty-icon.component'

// Stable sentinel — avoids allocating a new object on every init() when style is not passed.
const EMPTY_STYLE: Record<string, string> = {}

type OrchSnapshot = ReturnType<UploaderOrchestrator['getSnapshot']>
type ThemeSnapshot = ReturnType<ThemeStore['getSnapshot']>

@Injectable() // component-scoped: add to the component's providers:[UpupStore]
export class UpupStore {
    private props!: UpupUploaderProps
    private upload!: UpupUploadHandle
    core!: UpupUploadHandle['core']
    private orch!: UploaderOrchestrator
    private orchState!: SignalStore<OrchSnapshot>

    /** The orchestrator instance, exposed for the dropzone DragDropController. Set during init(). */
    get orchestrator(): UploaderOrchestrator { return this.orch }

    private themeStore!: ThemeStore
    private themeState!: SignalStore<ThemeSnapshot>
    private started = false
    private disposed = false
    private cleanups: Array<() => void> = []
    private inputEl: HTMLInputElement | null = null

    // Resolved values captured during init() — used by file-op handlers
    // (mirrors how svelte's create-root-provider closes over them).
    private accept = ''
    private onFileTypeMismatch: (file: File, accept: string) => void = () => {}
    private onRestrictionFailed?: (
        file: File,
        reason: 'TYPE_MISMATCH' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'LIMIT_EXCEEDED',
    ) => void

    /** Set during init(); undefined before init() is called. */
    mode!: 'client' | 'server'
    serverUrl?: string

    // ── i18n (set during init()) ─────────────────────────────────
    translations!: Signal<UiTranslations>
    translator!: Translator
    lang!: string
    dir!: string

    // ── Cloud drive configs (set during init()) ──────────────────
    oneDriveConfigs?: { onedrive_client_id: string; redirectUri?: string }
    googleDriveConfigs?: { google_client_id: string; google_api_key: string; google_app_id: string }
    dropboxConfigs?: { dropbox_client_id: string; dropbox_redirect_uri?: string }
    boxConfigs?: { box_client_id: string; box_redirect_uri?: string }

    // ── Resolved UI options aggregate (set during init()) ────────
    uiProps!: {
        mini: boolean
        maxRetries?: number
        resumable?: UpupUploaderProps['resumable']
        onError: (message: string) => void
        onIntegrationClick: (integrationType: string) => void
        onFileClick: (file: UploadFile) => void
        onFilesDragOver: (files: File[]) => void
        onFilesDragLeave: (files: File[]) => void
        onFilesDrop: (files: File[]) => void
        onWarn: (message: string) => void
        enablePaste: boolean
        sources: FileSource[]
        allowedFileTypes: string
        maxFileSize?: UpupUploaderProps['maxFileSize']
        limit: number
        isProcessing: boolean
        allowPreview: boolean
        folderUploadAllowDrop: boolean
        folderPickerButtonVisible: boolean
        showBranding: boolean
        disableDragDrop: boolean
        className: string
        style: Record<string, string>
        multiple: boolean
        icons: {
            ContainerAddMoreIcon: unknown
            FileDeleteIcon: unknown
            CameraCaptureIcon: unknown
            CameraRotateIcon: unknown
            CameraDeleteIcon: unknown
            LoaderIcon: unknown
        }
        imageEditor: ResolvedImageEditorOptions
    }

    // ── orchState computeds ──────────────────────────────────────
    files!: Signal<OrchSnapshot['files']>
    activeAdapter!: Signal<FileSource | undefined>
    isAddingMore!: Signal<boolean>
    viewMode!: Signal<'grid' | 'list'>
    isOnline!: Signal<boolean>
    editingFile!: Signal<UploadFile | null>
    totalProgress!: Signal<number>
    filesProgressMap!: Signal<OrchSnapshot['filesProgressMap']>
    uploadStatus!: Signal<UploadStatus>
    uploadError!: Signal<string | undefined>
    uploadSpeed!: Signal<number>
    uploadEta!: Signal<number>
    uploadedBytes!: Signal<number>
    totalBytes!: Signal<number>
    editorQueue!: Signal<OrchSnapshot['editorQueue']>

    // ── themeState computeds ─────────────────────────────────────
    themeMode!: Signal<ThemeSnapshot['themeMode']>
    isDark!: Signal<boolean>
    tokens!: Signal<ThemeSnapshot['tokens']>
    resolved!: Signal<ThemeSnapshot['resolved']>
    slotOverrides!: Signal<ThemeSnapshot['slotOverrides']>
    slots!: Signal<ThemeSnapshot['slots']>

    /** Call before init() to provide props. */
    setConfig(props: UpupUploaderProps): void {
        this.props = props
    }

    // Single error/warn routing (mirrors svelte create-root-provider lines 152-158).
    private onError(message: string): void {
        this.props?.onError?.(message)
    }
    private onWarn(message: string): void {
        this.props?.onWarn?.(message)
    }

    init(): void {
        if (this.started) return
        this.started = true
        this.disposed = false

        // ── Destructure props with defaults (mirrors create-root-provider ~39–104) ──
        const {
            allowedFileTypes: acceptProp = '*',
            mini = false,
            theme: themeProp,
            maxFiles,
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
            onFileRemove: onFileRemoveProp = () => {},
            onFileRemoved: onFileRemovedProp,
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
            onBeforeFileAdded,
            onFileTypeMismatch = () => {},
            onRestrictionFailed,
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
            // UI props needed for uiProps aggregate
            isProcessing = false,
            allowPreview = true,
            folderUpload,
            showBranding = true,
            disableDragDrop = false,
            className,
            style,
            icons = {},
            i18n,
            onIntegrationClick = () => {},
            onFileClick = () => {},
            onStatusChange,
            onFilesDragOver = () => {},
            onFilesDragLeave = () => {},
            onFilesDrop = () => {},
            enablePaste = false,
        } = this.props ?? {}

        // ── Resolved props (mirrors lines ~106–138) ──────────────
        const resolvedSources = sources
            ? (sources.map(s => normalizeSource(s as string)).filter(Boolean) as FileSource[])
            : DEFAULT_SOURCES
        const resolvedLimit = maxFiles ?? restrictions?.maxNumberOfFiles ?? 10
        const resolvedMode = modeProp ?? (serverUrl && !uploadEndpoint ? 'server' : 'client')
        const resolvedServerUrl = serverUrl
        const resolvedEndpoint = uploadEndpoint
        const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
        const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
        const maxTotalFileSize = maxTotalFileSizeProp ?? restrictions?.maxTotalFileSize
        const accept = resolveAccept(
            restrictions?.allowedFileTypes
                ? restrictions.allowedFileTypes.join(',')
                : (acceptProp as string),
        )
        const folderUploadAllowDrop = folderUpload?.allowDrop ?? false
        const folderPickerButtonVisible = folderUpload?.showSelectFolderButton ?? false
        const limit = mini ? 1 : Math.max(resolvedLimit, 1)
        const multiple = mini ? false : limit > 1

        const resolvedImageEditor: ResolvedImageEditorOptions = (() => {
            if (imageEditorProp === true) {
                return { enabled: true, autoOpen: 'never' as const, display: 'inline' as const }
            }
            if (typeof imageEditorProp === 'object' && imageEditorProp !== null) {
                return {
                    ...(imageEditorProp as object),
                    enabled: (imageEditorProp as any).enabled ?? true,
                    autoOpen: (imageEditorProp as any).autoOpen ?? 'never',
                    display: (imageEditorProp as any).display ?? 'inline',
                } as ResolvedImageEditorOptions
            }
            return { enabled: false, autoOpen: 'never' as const, display: 'inline' as const }
        })()

        // Store resolved scalars for consumers
        this.mode = resolvedMode as 'client' | 'server'
        this.serverUrl = resolvedServerUrl

        // Capture restriction-handling values for handleSetSelectedFiles
        // (mirrors svelte closing over accept/onFileTypeMismatch/onRestrictionFailed).
        this.accept = accept
        this.onFileTypeMismatch = onFileTypeMismatch
        this.onRestrictionFailed = onRestrictionFailed

        // ── Cloud drives mapping (Task 6 will add plugin registration) ──
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

        // ── Helper callbacks (route through the single this.onError/this.onWarn) ──
        const onError = (message: string): void => this.onError(message)
        const onWarn = (message: string): void => this.onWarn(message)

        // ── Core construction via createUpupUpload ───────────────
        this.upload = createUpupUpload({
            uploadEndpoint: resolvedEndpoint || undefined,
            serverUrl: resolvedServerUrl,
            provider,
            mode: resolvedMode as 'client' | 'server',
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
            onError: (err: unknown) =>
                onError(typeof err === 'string' ? err : (err as Error).message),
        })
        this.upload.start()
        this.core = this.upload.core

        // ── SSE processing ───────────────────────────────────────
        const sse = createSSEProcessing({
            processingEndpoint,
            onFileProcessed,
            onError: (err: Error) => onError(err.message),
            processingTimeout,
        })
        this.cleanups.push(() => sse.dispose())

        // ── Orchestrator callbacks (always fresh via getter proxy) ──
        const callbackRefs: OrchestratorCallbacks = {
            onError,
            onWarn,
            onUploadStart,
            onFileUploadStart,
            onFileUploadProgress,
            onFilesUploadProgress,
            onFileUploadComplete,
            onFilesUploadComplete: (files: UploadFile[]) => {
                onFilesUploadComplete(files)
                // SSE connection after upload complete
                files.forEach(file => sse.connectSSE(file))
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
            get imageEditorOptions() { return callbackRefs.imageEditorOptions },
            get autoUpload() { return callbackRefs.autoUpload },
        }

        // ── Orchestrator ─────────────────────────────────────────
        this.orch = new UploaderOrchestrator(this.core, proxiedCallbacks)
        this.orchState = toSignalStore(this.orch)

        // ── Theme store ──────────────────────────────────────────
        this.themeStore = new ThemeStore(themeProp)
        this.themeState = toSignalStore(this.themeStore)

        // ── Crash recovery ───────────────────────────────────────
        if (crashRecovery) {
            void this.core.restoreFromCrashRecovery().catch(() => undefined)
        }

        // ── Assign computeds AFTER stores exist ──────────────────
        this.files = computed(() => this.orchState.state().files)
        this.activeAdapter = computed(() => this.orchState.state().activeAdapter)
        this.isAddingMore = computed(() => this.orchState.state().isAddingMore)
        this.viewMode = computed(() => this.orchState.state().viewMode)
        this.isOnline = computed(() => this.orchState.state().isOnline)
        this.editingFile = computed(() => this.orchState.state().editingFile)
        this.totalProgress = computed(() => this.orchState.state().totalProgress)
        this.filesProgressMap = computed(() => this.orchState.state().filesProgressMap)
        this.uploadStatus = computed(() => this.orchState.state().uploadStatus)
        this.uploadError = computed(() => this.orchState.state().uploadError as string | undefined)
        this.uploadSpeed = computed(() => this.orchState.state().uploadSpeed)
        this.uploadEta = computed(() => this.orchState.state().uploadEta)
        this.uploadedBytes = computed(() => this.orchState.state().uploadedBytes)
        this.totalBytes = computed(() => this.orchState.state().totalBytes)
        this.editorQueue = computed(() => this.orchState.state().editorQueue)
        this.themeMode = computed(() => this.themeState.state().themeMode)
        this.isDark = computed(() => this.themeState.state().isDark)
        this.tokens = computed(() => this.themeState.state().tokens)
        this.resolved = computed(() => this.themeState.state().resolved)
        this.slotOverrides = computed(() => this.themeState.state().slotOverrides)
        this.slots = computed(() => this.themeState.state().slots)

        // ── Browser side-effects last (SSR-safe: both no-op without window) ──
        this.orch.init()
        this.themeStore.init()

        // ── Status-change subscription ───────────────────────────
        let lastStatus: UploadStatus | undefined
        const unsub = this.orch.subscribe(() => {
            const s = this.orch.getSnapshot().uploadStatus
            if (s && s !== lastStatus) {
                lastStatus = s
                onStatusChange?.(String(s).toLowerCase())
            }
        })
        this.cleanups.push(unsub)

        // ── Cloud drive configs ──────────────────────────────────
        this.oneDriveConfigs = cloudDrives?.oneDrive ? {
            onedrive_client_id: cloudDrives.oneDrive.clientId,
            redirectUri: cloudDrives.oneDrive.redirectUri,
        } : undefined
        this.googleDriveConfigs = cloudDrives?.googleDrive ? {
            google_client_id: cloudDrives.googleDrive.clientId,
            google_api_key: cloudDrives.googleDrive.apiKey,
            google_app_id: cloudDrives.googleDrive.appId,
        } : undefined
        this.dropboxConfigs = cloudDrives?.dropbox ? {
            dropbox_client_id: cloudDrives.dropbox.clientId,
            dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
        } : undefined
        this.boxConfigs = cloudDrives?.box ? {
            box_client_id: cloudDrives.box.clientId,
            box_redirect_uri: cloudDrives.box.redirectUri,
        } : undefined

        // ── Cloud drive plugin registration ──────────────────────
        const adapterPlugins: Array<{ destroy(): void }> = []

        if (this.googleDriveConfigs) {
            const plugin = new GoogleDrivePlugin()
            plugin.configure(this.googleDriveConfigs)
            try { this.core.use(plugin) } catch { /* already registered */ }
            adapterPlugins.push(plugin)
        }
        if (this.dropboxConfigs) {
            const plugin = new DropboxPlugin()
            plugin.configure(this.dropboxConfigs)
            try { this.core.use(plugin) } catch { /* already registered */ }
            adapterPlugins.push(plugin)
        }
        if (this.boxConfigs) {
            const plugin = new BoxPlugin()
            plugin.configure(this.boxConfigs)
            try { this.core.use(plugin) } catch { /* already registered */ }
            adapterPlugins.push(plugin)
        }
        if (this.oneDriveConfigs) {
            const plugin = new OneDrivePlugin()
            plugin.configure(this.oneDriveConfigs)
            try { this.core.use(plugin) } catch { /* already registered */ }
            adapterPlugins.push(plugin)
        }
        this.cleanups.push(() => {
            adapterPlugins.forEach(p => p.destroy())
        })

        // ── i18n resolution ──────────────────────────────────────
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
        this.translator = createTranslator({
            bundle: bundle ?? enUS,
            fallback: fallbackBundle ?? enUS,
            overrides: i18n?.overrides,
        })
        const resolvedTranslations = flattenTranslatorToUiTranslations(this.translator)
        this.translations = signal(resolvedTranslations)
        this.lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
        this.dir = bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)

        // ── Icons resolution ─────────────────────────────────────
        const resolvedIcons = {
            ContainerAddMoreIcon: icons.ContainerAddMoreIcon ?? EmptyIconComponent,
            FileDeleteIcon: icons.FileDeleteIcon ?? EmptyIconComponent,
            CameraCaptureIcon: icons.CameraCaptureIcon ?? EmptyIconComponent,
            CameraRotateIcon: icons.CameraRotateIcon ?? EmptyIconComponent,
            CameraDeleteIcon: icons.CameraDeleteIcon ?? EmptyIconComponent,
            LoaderIcon: icons.LoaderIcon ?? EmptyIconComponent,
        }

        // ── uiProps aggregate ────────────────────────────────────
        const resolvedStyle = style ?? EMPTY_STYLE
        this.uiProps = {
            mini,
            maxRetries,
            resumable,
            onError: (message: string) => this.onError(message),
            onIntegrationClick,
            onFileClick,
            onFilesDragOver,
            onFilesDragLeave,
            onFilesDrop,
            onWarn: (message: string) => this.onWarn(message),
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
        }
    }

    /** Current orchestrator snapshot (synchronous). */
    snapshot(): OrchSnapshot {
        return this.orchState.state()
    }

    // ── Input ref helpers ────────────────────────────────────────
    registerFileInput = (el: HTMLInputElement | null): void => { this.inputEl = el }
    getFileInput = (): HTMLInputElement | null => this.inputEl
    openFilePicker = (): void => { this.inputEl?.click() }

    // ── Orchestrator passthroughs ────────────────────────────────
    setActiveAdapter(a: FileSource | undefined): void { this.orch.setActiveAdapter(a) }
    setIsAddingMore(v: boolean): void { this.orch.setIsAddingMore(v) }
    setViewMode(m: 'grid' | 'list'): void { this.orch.setViewMode(m) }

    // ── File operations ──────────────────────────────────────────
    async handleSetSelectedFiles(newFiles: File[]): Promise<void> {
        try {
            await this.upload.addFiles(newFiles)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.onError(message)
            const first = newFiles[0]
            // Keyword heuristic on core's error message (mirrors @upup/svelte + the
            // other framework packages). Order matters: 'below' is checked before 'size'.
            if (first) {
                if (message.toLowerCase().includes('type')) {
                    this.onFileTypeMismatch(first, this.accept)
                    this.onRestrictionFailed?.(first, 'TYPE_MISMATCH')
                } else if (message.toLowerCase().includes('limit')) {
                    this.onRestrictionFailed?.(first, 'LIMIT_EXCEEDED')
                } else if (message.toLowerCase().includes('below')) {
                    this.onRestrictionFailed?.(first, 'FILE_TOO_SMALL')
                } else if (message.toLowerCase().includes('size')) {
                    this.onRestrictionFailed?.(first, 'FILE_TOO_LARGE')
                }
            }
        }
    }

    handleFileRemove(fileId: string): void {
        const file = this.orchState.state().files.get(fileId)
        if (file) revokeFileUrl(file)
        this.upload.removeFile(fileId)
    }

    async dynamicUpload(newFiles: File[] | UploadFile[]): Promise<UploadFile[] | undefined> {
        await this.upload.setFiles(newFiles as File[])
        return await this.upload.upload()
    }

    dynamicallyReplaceFiles(newFiles: File[] | UploadFile[]): void {
        this.orchState.state().files.forEach(file => revokeFileUrl(file))
        void this.upload.setFiles(newFiles as File[])
    }

    // ── Upload controls ──────────────────────────────────────────
    async proceedUpload(): Promise<UploadFile[] | undefined> {
        const current = [...this.orchState.state().files.values()]
        if (current.length === 0) return undefined
        const onPrepareFiles = this.props?.onPrepareFiles
        const prepared = onPrepareFiles ? await onPrepareFiles(current) : current
        if (prepared !== current) {
            await this.upload.setFiles(prepared as File[])
        }
        return await this.upload.upload()
    }

    async retryUpload(fileId?: string): Promise<UploadFile[] | undefined> {
        if (this.orchState.state().files.size === 0) return undefined
        return await this.upload.retry(fileId)
    }

    handleCancel(): void {
        this.upload.cancel()
        this.orchState.state().files.forEach(file => revokeFileUrl(file))
        this.upload.removeAll()
        this.orch.handleCancel()
    }

    handlePause(): void {
        this.upload.pause()
    }

    handleResume(): void {
        this.upload.resume()
    }

    handleDone(): void {
        this.props?.onDoneClicked?.()
        this.core?.emit('done', {})
        this.handleCancel()
    }

    resetState(): void {
        this.orch.setIsAddingMore(false)
        this.core?.emit('state-reset', {})
        this.handleDone()
    }

    // ── Image editor passthroughs ────────────────────────────────
    openImageEditor(file: UploadFile): void { this.orch.openImageEditor(file) }
    closeImageEditor(): void { this.orch.closeImageEditor() }
    saveImageEdit(editedImageData: string, mimeType?: string): void {
        this.orch.saveImageEdit(editedImageData, mimeType)
    }
    replaceFile(fileId: string, newFile: UploadFile): void {
        this.orch.replaceFile(fileId, newFile)
    }

    dispose(): void {
        if (this.disposed) return
        this.disposed = true
        this.started = false
        // cleanups: SSE dispose + status-change unsub + adapter plugin destroys
        this.cleanups.forEach(c => c())
        this.cleanups.length = 0
        this.orchState?.dispose()
        this.themeState?.dispose()
        this.orch?.destroy()
        this.themeStore?.destroy()
        this.upload?.dispose()
    }
}
