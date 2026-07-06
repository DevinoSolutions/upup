import { Injectable, computed, signal, type Signal } from '@angular/core'
import {
    FileSource,
    UploadStatus,
    type CloudDrivesConfig,
    type UploadFile,
    type UiTranslations,
    type Translator,
    type ResolvedImageEditorOptions,
} from '@upup/core'
import {
    UploaderOrchestrator,
    ThemeStore,
    normalizeUploaderOptions,
    createUploaderController,
    type UploaderControllerOptions,
    type UploaderController,
} from '@upup/core/internal'
import { createUpupUpload, type UpupUploadHandle } from './lib/use-upup-upload'
import { createSSEProcessing } from './lib/use-sse-processing'
import { toSignalStore, type SignalStore } from './lib/to-signal-store'
import type { UploaderProps } from './shared/types'
import { EmptyIconComponent } from './components/icons/empty-icon.component'
import { TrashIconComponent } from './components/icons/trash-icon.component'

// Stable sentinel — avoids allocating a new object on every init() when style is not passed.
const EMPTY_STYLE: Record<string, string> = {}

type OrchSnapshot = ReturnType<UploaderOrchestrator['getSnapshot']>
type ThemeSnapshot = ReturnType<ThemeStore['getSnapshot']>

@Injectable() // component-scoped: add to the component's providers:[UpupStore]
export class UpupStore {
    private props?: UploaderProps
    private upload!: UpupUploadHandle
    private root!: UploaderController
    core!: UpupUploadHandle['core']
    private orchState!: SignalStore<OrchSnapshot>

    /** The orchestrator instance, exposed for the dropzone DragDropController. Set during init(). */
    get orchestrator(): UploaderOrchestrator {
        return this.root.orchestrator
    }

    private themeState!: SignalStore<ThemeSnapshot>
    private started = false
    private destroyed = false
    private cleanups: Array<() => void> = []

    /** Set during init(); undefined before init() is called. */
    mode!: 'client' | 'server'
    serverUrl?: string | undefined

    // ── i18n (set during init()) ─────────────────────────────────
    translations!: Signal<UiTranslations>
    translator!: Translator
    lang!: string
    dir!: string

    // ── Cloud drive config (set during init()) ───────────────────
    cloudDrives?: CloudDrivesConfig | undefined

    // ── Resolved UI options aggregate (set during init()) ────────
    uiProps!: {
        mini: boolean
        maxRetries?: number | undefined
        resumable?: UploaderProps['resumable'] | undefined
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
        maxFileSize?: UploaderProps['maxFileSize'] | undefined
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
    activeSource!: Signal<FileSource | undefined>
    isAddingMore!: Signal<boolean>
    viewMode!: Signal<'grid' | 'list'>
    isOnline!: Signal<boolean>
    editingFile!: Signal<UploadFile | null>
    totalProgress!: Signal<number>
    filesProgressMap!: Signal<OrchSnapshot['filesProgressMap']>
    uploadStatus!: Signal<UploadStatus>
    uploadError!: Signal<string | undefined>
    uploadErrorCode!: Signal<string | undefined>
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
    setConfig(props: UploaderProps): void {
        this.props = props
    }

    // Single error/warn routing (mirrors svelte create-uploader-controller lines 152-158).
    private onError(message: string): void {
        this.props?.onError?.(message)
    }
    private onWarn(message: string): void {
        this.props?.onWarn?.(message)
    }

    init(): void {
        // Reset destroyed flag at the TOP so the destroy()→init() rebuild cycle works
        // repeatedly (even if init() was never called before this cycle).
        this.destroyed = false

        if (this.started) return
        this.started = true

        // ── Build factory-compatible options object ───────────────
        // UploaderProps.allowedFileTypes is string | string[] | undefined;
        // UploaderControllerOptions.allowedFileTypes is string | undefined.
        // normalizeUploaderOptions handles both via join cast.
        const p = this.props ?? {}
        const acceptProp = p.allowedFileTypes ?? '*'
        const factoryOptions: UploaderControllerOptions = {
            provider: p.provider,
            mode: p.mode,
            sources: p.sources,
            uploadEndpoint: p.uploadEndpoint,
            serverUrl: p.serverUrl,
            maxFiles: p.maxFiles,
            theme: p.theme,
            folderUpload: p.folderUpload,
            cors: p.cors,
            cloudDrives: p.cloudDrives,
            imageCompression: p.imageCompression ?? false,
            thumbnailGenerator: p.thumbnailGenerator ?? false,
            checksumVerification: p.checksumVerification ?? false,
            webWorker: p.webWorker,
            heicConversion: p.heicConversion ?? false,
            stripExifData: p.stripExifData ?? false,
            contentDeduplication: p.contentDeduplication ?? false,
            autoUpload: p.autoUpload ?? false,
            maxConcurrentUploads: p.maxConcurrentUploads,
            crashRecovery: p.crashRecovery ?? false,
            allowedFileTypes:
                typeof acceptProp === 'string'
                    ? acceptProp
                    : acceptProp.join(','),
            mini: p.mini ?? false,
            isProcessing: p.isProcessing ?? false,
            allowPreview: p.allowPreview ?? true,
            showBranding: p.showBranding ?? true,
            disableDragDrop: p.disableDragDrop ?? false,
            className: p.className,
            maxFileSize: p.maxFileSize,
            minFileSize: p.minFileSize,
            maxTotalFileSize: p.maxTotalFileSize,
            imageEditor: p.imageEditor,
            metadata: p.metadata,
            maxRetries: p.maxRetries,
            resumable: p.resumable,
            i18n: p.i18n,
            onBeforeFileAdded: p.onBeforeFileAdded,
            onError: p.onError,
            onWarn: p.onWarn,
            onUploadStart: p.onUploadStart ?? (() => {}),
            onFileUploadStart: p.onFileUploadStart ?? (() => {}),
            onFileUploadProgress: p.onFileUploadProgress ?? (() => {}),
            onFilesUploadProgress: p.onFilesUploadProgress ?? (() => {}),
            onFileUploadComplete: p.onFileUploadComplete ?? (() => {}),
            onFilesUploadComplete: p.onFilesUploadComplete ?? (() => {}),
            onUploadComplete: p.onUploadComplete ?? (() => {}),
            onFilesSelected: p.onFilesSelected ?? (() => {}),
            onDoneClicked: p.onDoneClicked ?? (() => {}),
            onPrepareFiles: p.onPrepareFiles,
            onFileRemoved: p.onFileRemoved,
            onStatusChange: p.onStatusChange,
            onFileTypeMismatch: p.onFileTypeMismatch ?? (() => {}),
            onRestrictionFailed: p.onRestrictionFailed,
        }

        // ── Normalize options (pure) ─────────────────────────────
        const normalized = normalizeUploaderOptions(factoryOptions)
        const { resolved } = normalized

        // Store resolved scalars for consumers
        this.mode = resolved.mode
        this.serverUrl = resolved.serverUrl

        // ── Core construction via createUpupUpload (FRESH per init() call) ────────
        // Each init() creates a brand-new core + factory so cloud plugins can register
        // cleanly (plugin.use() throws on duplicate; no unregister; fresh core avoids this).
        this.upload = createUpupUpload({
            ...normalized.coreOptions,
            onError: (err: unknown) => {
                this.onError(
                    typeof err === 'string' ? err : (err as Error).message,
                )
            },
        })
        this.upload.start()
        this.core = this.upload.core

        // ── SSE processing ───────────────────────────────────────
        const sse = createSSEProcessing({
            processingEndpoint: p.processingEndpoint,
            onFileProcessed: p.onFileProcessed,
            onError: (err: Error) => {
                this.onError(err.message)
            },
            processingTimeout: p.processingTimeout,
        })
        this.cleanups.push(() => {
            sse.destroy()
        })

        // ── Root controller (FRESH per init() call) ──────────────
        // Owns orchestrator, theme, plugin registration, callback proxy,
        // status-change dedup, crash recovery, file-input registration.
        this.root = createUploaderController(
            { core: this.upload.core, options: factoryOptions, normalized },
            {
                connectSSE: file => {
                    sse.connectSSE(file)
                },
            },
        )

        // ── Callback proxy — updateCallbacks feeds the proxy's mutable ref ──
        this.root.updateCallbacks({
            onError: (message: string) => {
                this.onError(message)
            },
            onWarn: (message: string) => {
                this.onWarn(message)
            },
            onUploadStart: p.onUploadStart ?? (() => {}),
            onFileUploadStart: p.onFileUploadStart ?? (() => {}),
            onFileUploadProgress: p.onFileUploadProgress ?? (() => {}),
            onFilesUploadProgress: p.onFilesUploadProgress ?? (() => {}),
            onFileUploadComplete: p.onFileUploadComplete ?? (() => {}),
            onFilesUploadComplete: p.onFilesUploadComplete ?? (() => {}),
            onUploadComplete: p.onUploadComplete ?? (() => {}),
            onFilesSelected: p.onFilesSelected ?? (() => {}),
            onDoneClicked: p.onDoneClicked ?? (() => {}),
            onPrepareFiles: p.onPrepareFiles,
            onFileRemoved: p.onFileRemoved,
            onStatusChange: p.onStatusChange,
            onFileTypeMismatch: p.onFileTypeMismatch ?? (() => {}),
            onRestrictionFailed: p.onRestrictionFailed,
            autoUpload: p.autoUpload ?? false,
        })

        // ── Signal bridges (KEEP: toSignalStore separately for orch + theme) ──────
        this.orchState = toSignalStore(this.root.orchestrator)
        this.themeState = toSignalStore(this.root.theme)

        // ── Assign computeds AFTER stores exist ──────────────────
        this.files = computed(() => this.orchState.state().files)
        this.activeSource = computed(() => this.orchState.state().activeSource)
        this.isAddingMore = computed(() => this.orchState.state().isAddingMore)
        this.viewMode = computed(() => this.orchState.state().viewMode)
        this.isOnline = computed(() => this.orchState.state().isOnline)
        this.editingFile = computed(() => this.orchState.state().editingFile)
        this.totalProgress = computed(
            () => this.orchState.state().totalProgress,
        )
        this.filesProgressMap = computed(
            () => this.orchState.state().filesProgressMap,
        )
        this.uploadStatus = computed(() => this.orchState.state().uploadStatus)
        this.uploadError = computed(
            () => this.orchState.state().uploadError as string | undefined,
        )
        this.uploadErrorCode = computed(
            () => this.orchState.state().uploadErrorCode,
        )
        this.uploadSpeed = computed(() => this.orchState.state().uploadSpeed)
        this.uploadEta = computed(() => this.orchState.state().uploadEta)
        this.uploadedBytes = computed(
            () => this.orchState.state().uploadedBytes,
        )
        this.totalBytes = computed(() => this.orchState.state().totalBytes)
        this.editorQueue = computed(() => this.orchState.state().editorQueue)
        this.themeMode = computed(() => this.themeState.state().themeMode)
        this.isDark = computed(() => this.themeState.state().isDark)
        this.tokens = computed(() => this.themeState.state().tokens)
        this.resolved = computed(() => this.themeState.state().resolved)
        this.slotOverrides = computed(
            () => this.themeState.state().slotOverrides,
        )
        this.slots = computed(() => this.themeState.state().slots)

        // ── Factory lifecycle (orchestrator.init + theme.init + plugins + status) ──
        this.root.init()

        // ── Cloud drive config (from factory's resolved, not re-computed inline) ──
        this.cloudDrives = resolved.cloudDrives

        // ── i18n (from factory's resolved) ──────────────────────
        this.translator = resolved.translator
        const resolvedTranslations = resolved.translations
        this.translations = signal(resolvedTranslations)
        this.lang = resolved.lang
        this.dir = resolved.dir

        // ── Icons resolution (framework-specific: Angular Type<unknown>) ──────────
        const icons = p.icons ?? {}
        const resolvedIcons = {
            ContainerAddMoreIcon:
                icons.ContainerAddMoreIcon ?? EmptyIconComponent,
            FileDeleteIcon: icons.FileDeleteIcon ?? TrashIconComponent,
            CameraCaptureIcon: icons.CameraCaptureIcon ?? EmptyIconComponent,
            CameraRotateIcon: icons.CameraRotateIcon ?? EmptyIconComponent,
            CameraDeleteIcon: icons.CameraDeleteIcon ?? EmptyIconComponent,
            LoaderIcon: icons.LoaderIcon ?? EmptyIconComponent,
        }

        // ── uiProps aggregate (framework-specific fields + resolved scalars) ──────
        const resolvedStyle = p.style ?? EMPTY_STYLE
        this.uiProps = {
            mini: resolved.mini,
            maxRetries: p.maxRetries,
            resumable: p.resumable,
            onError: (message: string) => {
                this.onError(message)
            },
            onIntegrationClick: p.onIntegrationClick ?? (() => {}),
            onFileClick: p.onFileClick ?? (() => {}),
            onFilesDragOver: p.onFilesDragOver ?? (() => {}),
            onFilesDragLeave: p.onFilesDragLeave ?? (() => {}),
            onFilesDrop: p.onFilesDrop ?? (() => {}),
            onWarn: (message: string) => {
                this.onWarn(message)
            },
            enablePaste: p.enablePaste ?? false,
            sources: resolved.sources,
            allowedFileTypes: resolved.allowedFileTypes,
            maxFileSize: resolved.maxFileSize,
            limit: resolved.limit,
            isProcessing: p.isProcessing ?? false,
            allowPreview: p.allowPreview ?? true,
            folderUploadAllowDrop: resolved.folderUploadAllowDrop,
            folderPickerButtonVisible: resolved.folderPickerButtonVisible,
            showBranding: p.showBranding ?? true,
            disableDragDrop: p.disableDragDrop ?? false,
            className: p.className ?? '',
            style: resolvedStyle,
            multiple: resolved.multiple,
            icons: resolvedIcons,
            imageEditor: resolved.imageEditor,
        }
    }

    /** Current orchestrator snapshot (synchronous). */
    snapshot(): OrchSnapshot {
        return this.orchState.state()
    }

    // ── Input ref helpers (delegated to factory) ─────────────────
    registerFileInput = (el: HTMLInputElement | null): void => {
        this.root.registerFileInput(el)
    }
    getFileInput = (): HTMLInputElement | null => this.root.getFileInput()
    openFilePicker = (): void => {
        this.root.openFilePicker()
    }

    // ── Orchestrator passthroughs (delegated to root.commands) ───
    setActiveSource(a: FileSource | undefined): void {
        this.root.commands.setActiveSource(a)
    }
    setIsAddingMore(v: boolean): void {
        this.root.commands.setIsAddingMore(v)
    }
    setViewMode(m: 'grid' | 'list'): void {
        this.root.commands.setViewMode(m)
    }

    // ── File operations (delegated to root.commands) ─────────────
    async handleSetSelectedFiles(newFiles: File[]): Promise<void> {
        await this.root.commands.handleSetSelectedFiles(newFiles)
    }

    handleFileRemove(fileId: string): void {
        this.root.commands.handleFileRemove(fileId)
    }

    async uploadFiles(
        newFiles: File[] | UploadFile[],
    ): Promise<UploadFile[] | undefined> {
        return this.root.commands.uploadFiles(newFiles)
    }

    replaceFiles(newFiles: File[] | UploadFile[]): void {
        this.root.commands.replaceFiles(newFiles)
    }

    // ── Upload controls (delegated to root.commands) ─────────────
    async startUpload(): Promise<UploadFile[] | undefined> {
        return this.root.commands.startUpload()
    }

    async retryUpload(fileId?: string): Promise<UploadFile[] | undefined> {
        return this.root.commands.retryUpload(fileId)
    }

    handleCancel(): void {
        this.root.commands.handleCancel()
    }

    handlePause(): void {
        this.root.commands.handlePause()
    }

    handleResume(): void {
        this.root.commands.handleResume()
    }

    handleDone(): void {
        this.root.commands.handleDone()
    }

    resetState(): void {
        this.root.commands.resetState()
    }

    // ── Image editor passthroughs (delegated to root.commands) ───
    openImageEditor(file: UploadFile): void {
        this.root.commands.openImageEditor(file)
    }
    closeImageEditor(): void {
        this.root.commands.closeImageEditor()
    }
    saveImageEdit(editedImageData: string, mimeType?: string): void {
        this.root.commands.saveImageEdit(editedImageData, mimeType)
    }
    replaceFile(fileId: string, newFile: UploadFile): void {
        this.root.commands.replaceFile(fileId, newFile)
    }

    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.started = false
        // cleanups: SSE destroy (+ any other per-init cleanups)
        this.cleanups.forEach(c => {
            c()
        })
        this.cleanups.length = 0
        this.root?.destroy() // orchestrator/theme/plugins/status — idempotent
        this.orchState?.destroy()
        this.themeState?.destroy()
        this.upload?.destroy() // createUpupUpload owns core.destroy()
    }
}
