import { Injectable, computed, type Signal } from '@angular/core'
import {
    FileSource,
    UploadStatus,
    UploaderOrchestrator,
    ThemeStore,
    normalizeSource,
    DEFAULT_SOURCES,
    DEFAULT_MAX_FILE_SIZE,
    resolveAccept,
    revokeFileUrl,
    type OrchestratorCallbacks,
    type UploadFile,
    type ResolvedImageEditorOptions,
} from '@upup/core'
import { createUpupUpload, type UpupUploadHandle } from './lib/use-upup-upload'
import { toSignalStore, type SignalStore } from './lib/to-signal-store'
import type { UpupUploaderProps } from './shared/types'

type OrchSnapshot = ReturnType<UploaderOrchestrator['getSnapshot']>
type ThemeSnapshot = ReturnType<ThemeStore['getSnapshot']>

@Injectable() // component-scoped: add to the component's providers:[UpupStore]
export class UpupStore {
    private props!: UpupUploaderProps
    private upload!: UpupUploadHandle
    core!: UpupUploadHandle['core']
    private orch!: UploaderOrchestrator
    private orchState!: SignalStore<OrchSnapshot>
    private themeStore!: ThemeStore
    private themeState!: SignalStore<ThemeSnapshot>
    private started = false
    private disposed = false
    private cleanups: Array<() => void> = []
    private inputEl: HTMLInputElement | null = null

    // Resolved scalars set during init()
    mode!: 'client' | 'server'
    serverUrl?: string

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
            heicConversion = false,
            stripExifData = false,
            contentDeduplication = false,
            crashRecovery = false,
            sources,
            onError: errorHandler,
            onWarn: warningHandler,
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
            // Task 6: processingEndpoint, onFileProcessed, processingTimeout
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
        const limit = mini ? 1 : Math.max(resolvedLimit, 1)

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

        // ── Helper callbacks ─────────────────────────────────────
        const onError = (message: string): void => {
            errorHandler?.(message)
        }
        const onWarn = (message: string): void => {
            warningHandler?.(message)
        }

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

        // Task 6: useSSEProcessing({ processingEndpoint, onFileProcessed, processingTimeout })

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
                // Task 6: connectSSE forEach here
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
            get imageEditorOptions() { return resolvedImageEditor },
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
        this.themeMode = computed(() => this.themeState.state().themeMode)
        this.isDark = computed(() => this.themeState.state().isDark)
        this.tokens = computed(() => this.themeState.state().tokens)
        this.resolved = computed(() => this.themeState.state().resolved)
        this.slotOverrides = computed(() => this.themeState.state().slotOverrides)
        this.slots = computed(() => this.themeState.state().slots)

        // ── Browser side-effects last (SSR-safe: both no-op without window) ──
        this.orch.init()
        this.themeStore.init()

        // Task 6: onStatusChange subscription here
        // Task 6: cloud-drive plugin registration (core.use) here
        // Task 6: i18n/translations resolution here
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
            this.props?.onError?.(message)
            const first = newFiles[0]
            if (first) {
                if (message.toLowerCase().includes('type')) {
                    this.props?.onRestrictionFailed?.(first, 'TYPE_MISMATCH')
                } else if (message.toLowerCase().includes('small')) {
                    this.props?.onRestrictionFailed?.(first, 'FILE_TOO_SMALL')
                } else if (message.toLowerCase().includes('size')) {
                    this.props?.onRestrictionFailed?.(first, 'FILE_TOO_LARGE')
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
        this.cleanups.forEach(c => c())
        this.cleanups.length = 0
        this.orchState?.dispose()
        this.themeState?.dispose()
        this.orch?.destroy()
        this.themeStore?.destroy()
        this.upload?.dispose()
    }
}
