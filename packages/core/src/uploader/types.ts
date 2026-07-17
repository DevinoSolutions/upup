import type { UpupCore, CoreOptions } from '../core'
import type { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { OrchestratorCallbacks } from '../orchestrator/types'
import type { ThemeStore } from '../theme/theme-store'
import type { UpupThemeConfig } from '../theme/types'
import type { FileSource } from '../types/file-source'
import type {
    ResolvedImageEditorOptions,
    ImageEditorOptions,
} from '../types/image-editor'
import type { UploadFile } from '../types/upload-file'
import type { Translator, LocaleBundle, PartialMessages } from '../i18n/types'
import type { UiTranslations } from '../i18n/ui-translations'
import type { ResumableUploadOptions } from '../types/upload-protocols'
import type { CloudDrivesConfig } from '../drives/configs'
import type { MotionGate } from './motion-gate'
import type { TransientUiState } from './transient-ui-state'

/** i18n option block (identical across frameworks). */
export interface UploaderI18nOptions {
    bundle?: LocaleBundle
    locale?: LocaleBundle | string
    fallbackLocale?: LocaleBundle | string
    overrides?: PartialMessages
}

/** Every callback the orchestrator/commands/proxy may invoke (framework-agnostic superset). */
export interface UploaderCallbacks extends OrchestratorCallbacks {
    // convenience (core-event bridges; wired by the host's upload hook, not the factory)
    onFileAdded?: ((files: UploadFile[]) => void) | undefined
    onUploadProgress?:
        | ((p: { fileId: string; loaded: number; total: number }) => void)
        | undefined
    // restriction / status (read by commands + status-change)
    onStatusChange?: ((status: string) => void) | undefined
    onFileTypeMismatch?:
        ((file: File, acceptedTypes: string) => void) | undefined
    onRestrictionFailed?:
        | ((
              file: File,
              reason:
                  | 'TYPE_MISMATCH'
                  | 'FILE_TOO_LARGE'
                  | 'FILE_TOO_SMALL'
                  | 'LIMIT_EXCEEDED',
          ) => void)
        | undefined
    onDoneClicked?: (() => void) | undefined
    autoUpload?: boolean | undefined
}

/** Options accepted by the factory (framework-agnostic superset; each framework's props satisfy this structurally). */
export interface UploaderControllerOptions
    extends Omit<CoreOptions, 'onError'>, UploaderCallbacks {
    dark?: boolean | undefined
    theme?: UpupThemeConfig | undefined
    sources?: Array<FileSource | string> | undefined
    mini?: boolean | undefined
    animations?: boolean | undefined
    isProcessing?: boolean | undefined
    allowPreview?: boolean | undefined
    showBranding?: boolean | undefined
    disableDragDrop?: boolean | undefined
    className?: string | undefined
    folderUpload?:
        { allowDrop?: boolean; showSelectFolderButton?: boolean } | undefined
    imageEditor?: boolean | ImageEditorOptions | undefined
    enablePaste?: boolean | undefined
    resumable?: ResumableUploadOptions | undefined
    i18n?: UploaderI18nOptions | undefined
    onIntegrationClick?: ((sourceId: string) => void) | undefined
    onPrepareFiles?:
        ((files: UploadFile[]) => Promise<UploadFile[]>) | undefined
    maxFiles?: number | undefined
}

/** All resolved scalars + i18n + cloud-drive config (static, computed once). */
export interface UploaderResolved {
    cloudDrives?: CloudDrivesConfig | undefined
    mini: boolean
    animations: boolean
    sources: FileSource[]
    allowedFileTypes: string
    limit: number
    maxFileSize: import('../contracts').MaxFileSizeObject
    multiple: boolean
    mode: 'client' | 'server'
    serverUrl?: string | undefined
    folderUploadAllowDrop: boolean
    folderPickerButtonVisible: boolean
    imageEditor: ResolvedImageEditorOptions
    resumable?: ResumableUploadOptions | undefined
    translator: Translator
    translations: UiTranslations
    lang: string
    dir: 'ltr' | 'rtl'
}

/** Output of the pure normalizer: the CoreOptions object to build core with, plus all resolved values. */
export interface NormalizedUploaderOptions {
    coreOptions: CoreOptions
    resolved: UploaderResolved
}

/** Imperative command surface (delegates to core + orchestrator). */
export interface UploaderCommands {
    handleSetSelectedFiles(newFiles: File[]): Promise<void>
    handleFileRemove(fileId: string): void
    handleRemoveAll(): void
    uploadFiles(
        newFiles: File[] | UploadFile[],
    ): Promise<UploadFile[] | undefined>
    replaceFiles(newFiles: File[] | UploadFile[]): void
    startUpload(): Promise<UploadFile[] | undefined>
    retryUpload(fileId?: string): Promise<UploadFile[] | undefined>
    handleCancel(): void
    handlePause(): void
    handleResume(): void
    handleDone(): void
    resetState(): void
    openImageEditor(file: UploadFile): void
    closeImageEditor(): void
    saveImageEdit(editedImageData: string, mimeType?: string): void
    replaceFile(fileId: string, newFile: UploadFile): void
    setActiveSource(source: FileSource | undefined): void
    setIsAddingMore(value: boolean): void
    setViewMode(mode: 'grid' | 'list'): void
}

/** Optional host injection points. */
export interface UploaderHostHooks {
    /** Per-framework SSE wiring; called for each completed file in onFilesUploadComplete. Vanilla omits. */
    connectSSE?: (file: UploadFile) => void
    /** Manual render-loop nudge (vanilla). Frameworks with reactive bridges omit. */
    invalidate?: () => void
}

/** Parameters for the factory: the host-created core, the raw options, and the precomputed normalization. */
export interface CreateUploaderControllerParams {
    core: UpupCore
    options: UploaderControllerOptions
    normalized: NormalizedUploaderOptions
}

/** Stable handle returned by the factory. */
export interface UploaderController {
    core: UpupCore
    orchestrator: UploaderOrchestrator
    theme: ThemeStore
    /** Reduced-motion gate: `off` iff `animations={false}` or the OS asks. */
    motionGate: MotionGate
    /** Deferred-removal / source-overlay / drop-rejection transient UI state. */
    transientUi: TransientUiState
    resolved: UploaderResolved
    commands: UploaderCommands
    registerFileInput(el: HTMLInputElement | null): void
    getFileInput(): HTMLInputElement | null
    openFilePicker(): void
    /** Refresh the proxied callbacks (React calls every render; others once). */
    updateCallbacks(callbacks: UploaderCallbacks): void
    /** Optional fan-in of core `state-change` + orchestrator + theme notifications. */
    subscribe(listener: () => void): () => void
    /** Idempotent: orchestrator.init + theme.init + plugin registration + crash recovery + status-change. */
    init(): void
    /** Idempotent + re-entrant: reverse of init; safe for Angular config rebuild. */
    destroy(): void
}
