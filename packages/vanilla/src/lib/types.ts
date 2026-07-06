// src/lib/types.ts
import type {
    UpupCore,
    UploadFile,
    UploadStatus,
    FileSource,
    CoreOptions,
    ExtensionMethods,
    Translations,
    Translator,
    MaxFileSizeObject,
    ResolvedImageEditorOptions,
    UpupThemeConfig,
    UploadSource,
    LocaleBundle,
    PartialMessages,
    DriveFile,
    DriveFolder,
    CloudDrivesConfig,
} from '@upup/core'
import type {
    UploaderOrchestrator,
    ThemeStore,
    DriveBrowserController,
    DragDropController,
} from '@upup/core/internal'

// Dropzone controller now lives in @upup/core (hoisted in Workstream C-1 Unit 2).
export type {
    DragDropController,
    DragDropSnapshot,
    DragDropDeps,
} from '@upup/core/internal'

/** Flat, framework-free snapshot the render loop reads and subscribe() emits. */
export interface UploaderSnapshot {
    files: UploadFile[]
    status: UploadStatus
    progress: { totalFiles: number; completedFiles: number; percentage: number }
    error: Error | null
    activeSource: FileSource | undefined
    viewMode: 'grid' | 'list'
}

/** Cloud-drive config shape accepted by createUploader (mirrors svelte UploaderProps.cloudDrives). */
export interface VanillaCloudDrives {
    googleDrive?: { clientId: string; apiKey: string; appId: string }
    oneDrive?: { clientId: string; redirectUri?: string }
    dropbox?: { clientId: string; redirectUri?: string }
    box?: { clientId: string; redirectUri?: string }
}

/** Options accepted by createUploader: the CoreOptions surface + UI + convenience callbacks. */
export interface CreateUploaderOptions extends Omit<
    CoreOptions,
    'cloudDrives'
> {
    /** Initial theme; true => dark. Maps to ThemeStore('dark'|'light'). */
    dark?: boolean
    /** svelte UploaderProps.theme passthrough when present (takes precedence over `dark`). */
    theme?: UpupThemeConfig
    sources?: UploadSource[]
    /** Mirrors svelte UploaderProps.maxFiles — max number of files. Resolution: maxFiles ?? 10. */
    maxFiles?: number
    className?: string
    showBranding?: boolean
    disableDragDrop?: boolean
    mini?: boolean
    isProcessing?: boolean
    allowPreview?: boolean
    folderUpload?: { allowDrop?: boolean; showSelectFolderButton?: boolean }
    cloudDrives?: VanillaCloudDrives
    i18n?: {
        bundle?: LocaleBundle
        locale?: LocaleBundle | string
        fallbackLocale?: LocaleBundle | string
        overrides?: PartialMessages
    }
    // convenience callbacks (same mapping as svelte useUpupUpload):
    onFileAdded?: (files: UploadFile[]) => void
    onFileRemoved?: (file: UploadFile) => void
    onUploadProgress?: (p: {
        fileId: string
        loaded: number
        total: number
    }) => void
    onUploadComplete?: (files: UploadFile[]) => void
    /** Called when the user clicks Done (before files are cleared) — mirrors svelte's onDoneClicked prop. */
    onDoneClicked?: () => void
    /** Called when a source tile is clicked (before the source-click emit) — mirrors svelte's onIntegrationClick prop. */
    onIntegrationClick?: (sourceId: string) => void
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onWarn?: (message: string) => void
    enablePaste?: boolean
}

/** Base controller contract. invalidate() is injected at construction by the render loop. */
export interface UploaderController<S = unknown> {
    getSnapshot(): S
    destroy(): void
}

/** Controllers that own a source view also implement activate/deactivate. */
export interface SourceController<S = unknown> extends UploaderController<S> {
    activate(): void
    deactivate(): void
}

/** Lazily-instantiated controllers, keyed; the render loop destroys inactive ones on source switch. */
export interface ControllerRegistry {
    fileInput: import('../controllers/file-input').FileInputController
    dragDrop: DragDropController
    /** active per-source controller cache (camera/audio/screen/drive); see context.ts getController(). */
    getCamera(): import('../controllers/camera').CameraController
    getAudio(): import('../controllers/audio-recorder').AudioRecorderController
    getScreen(): import('../controllers/screen-capture').ScreenCaptureController
    /** drive browser controllers are core DriveBrowserController instances, cached by FileSource. */
    getDrive(source: FileSource): DriveBrowserController
    /** destroy every cached per-source controller (called on source switch + destroy). */
    destroyActive(): void
    /** destroy everything including fileInput + dragDrop (called on destroy). */
    destroyAll(): void
}

/** Resolved props (plain values, mirroring svelte ContextProps). */
export interface UploaderContextProps {
    mini: boolean
    sources: FileSource[]
    allowedFileTypes: string
    limit: number
    maxFileSize: MaxFileSizeObject | undefined
    multiple: boolean
    isProcessing: boolean
    allowPreview: boolean
    showBranding: boolean
    disableDragDrop: boolean
    className: string
    folderUploadAllowDrop: boolean
    folderPickerButtonVisible: boolean
    imageEditor: ResolvedImageEditorOptions
    onIntegrationClick: (sourceId: string) => void
    resumable: CoreOptions['resumable']
}

/** The flat root context every template fn receives. Replicates svelte createUploaderController data without core extraction. */
export interface UploaderContext {
    core: UpupCore
    orchestrator: UploaderOrchestrator
    theme: ThemeStore
    mode: 'client' | 'server'
    serverUrl: string | undefined
    translations: Translations
    translator: Translator
    lang: string
    dir: 'ltr' | 'rtl'
    props: UploaderContextProps
    cloudDrives?: CloudDrivesConfig | undefined
    registerFileInput(el: HTMLInputElement | null): void
    getFileInput(): HTMLInputElement | null
    openFilePicker(): void
    setActiveSource(a: FileSource | undefined): void
    setIsAddingMore(v: boolean): void
    setViewMode(m: 'grid' | 'list'): void
    setFiles(files: File[]): Promise<void>
    handleFileRemove(fileId: string): void
    handleRemoveAll(): void
    startUpload(): Promise<UploadFile[] | undefined>
    retryUpload(fileId?: string): Promise<UploadFile[] | undefined>
    handleDone(): void
    handleCancel(): void
    handlePause(): void
    handleResume(): void
    controllers: ControllerRegistry
    /** request a re-render (microtask-coalesced by the render loop). */
    invalidate(): void
    /** Report a user-facing error message (routed to options.onError). Used by URL fetch + other views. */
    onError?: (message: string) => void
}

/** The public instance returned by createUploader. Mirrors svelte UseUpupUploadReturn + lifecycle. */
export interface UpupInstance {
    getState(): UploaderSnapshot
    subscribe(cb: (s: UploaderSnapshot) => void): () => void
    addFiles(files: File[]): Promise<void>
    removeFile(id: string): void
    removeAll(): void
    setFiles(files: File[]): Promise<void>
    reorderFiles(ids: string[]): void
    upload(): Promise<UploadFile[]>
    pause(): void
    resume(): void
    cancel(): void
    retry(fileId?: string): Promise<UploadFile[]>
    on(event: string, h: (...a: unknown[]) => void): () => void
    ext: Record<string, ExtensionMethods>
    core: UpupCore
    el: HTMLElement
    destroy(): void
}

/** Re-exported drive types used by drive templates/controllers. */
export type { DriveFile, DriveFolder }
