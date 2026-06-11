// src/lib/types.ts
import type {
  UpupCore, UploadFile, UploadStatus, FileSource, CoreOptions, ExtensionMethods,
  UploaderOrchestrator, ThemeStore, Translations, Translator, MaxFileSizeObject,
  ResolvedImageEditorOptions, UpupThemeConfig, UploadSource, LocaleBundle, PartialMessages,
  DriveFile, DriveFolder, AdapterBrowserController,
} from '@upup/core'

/** Flat, framework-free snapshot the render loop reads and subscribe() emits. */
export interface UploaderSnapshot {
  files: UploadFile[]
  status: UploadStatus
  progress: { totalFiles: number; completedFiles: number; percentage: number }
  error: Error | null
  activeAdapter: FileSource | undefined
  viewMode: 'grid' | 'list'
}

/** Cloud-drive config shape accepted by createUploader (mirrors svelte UpupUploaderProps.cloudDrives). */
export interface VanillaCloudDrives {
  googleDrive?: { clientId: string; apiKey: string; appId: string }
  oneDrive?: { clientId: string; redirectUri?: string }
  dropbox?: { clientId: string; redirectUri?: string }
  box?: { clientId: string; redirectUri?: string }
}

/** Options accepted by createUploader: the CoreOptions surface + UI + convenience callbacks. */
export interface CreateUploaderOptions extends Omit<CoreOptions, 'cloudDrives'> {
  /** Initial theme; true => dark. Maps to ThemeStore('dark'|'light'). */
  dark?: boolean
  /** svelte UpupUploaderProps.theme passthrough when present (takes precedence over `dark`). */
  theme?: UpupThemeConfig
  sources?: UploadSource[]
  /** Mirrors svelte UpupUploaderProps.maxFiles — max number of files. Resolution: maxFiles ?? restrictions?.maxNumberOfFiles ?? 10. */
  maxFiles?: number
  className?: string
  showBranding?: boolean
  disableDragDrop?: boolean
  mini?: boolean
  isProcessing?: boolean
  allowPreview?: boolean
  folderUpload?: { allowDrop?: boolean; showSelectFolderButton?: boolean }
  cloudDrives?: VanillaCloudDrives
  i18n?: { bundle?: LocaleBundle; locale?: LocaleBundle | string; fallbackLocale?: LocaleBundle | string; overrides?: PartialMessages }
  // convenience callbacks (same mapping as svelte useUpupUpload):
  onFileAdded?: (files: UploadFile[]) => void
  onFileRemoved?: (file: UploadFile) => void
  onUploadProgress?: (p: { fileId: string; loaded: number; total: number }) => void
  onUploadComplete?: (files: UploadFile[]) => void
  /** Called when the user clicks Done (before files are cleared) — mirrors svelte's onDoneClicked prop. */
  onDoneClicked?: () => void
  /** Called when a source tile is clicked (before the source-click emit) — mirrors svelte's onIntegrationClick prop. */
  onIntegrationClick?: (sourceId: string) => void
}

/** Base controller contract. invalidate() is injected at construction by the render loop. */
export interface UploaderController<S = unknown> {
  getSnapshot(): S
  dispose(): void
}

/** Controllers that own an adapter view also implement activate/deactivate. */
export interface AdapterController<S = unknown> extends UploaderController<S> {
  activate(): void
  deactivate(): void
}

/** Lazily-instantiated controllers, keyed; the render loop disposes inactive ones on adapter switch. */
/**
 * NOTE: The five `import('../controllers/…')` types below reference modules added in Tasks 8–12.
 * Until those land, `tsc --noEmit` emits 5 expected TS2307 errors — the plan's convergence gate
 * (Task 12) is where the package typecheck goes green. Do not "fix" by stubbing controllers.
 */
export interface ControllerRegistry {
  fileInput: import('../controllers/file-input').FileInputController
  dragDrop: import('../controllers/drag-drop').DragDropController
  /** active per-source controller cache (camera/audio/screen/drive); see context.ts getController(). */
  getCamera(): import('../controllers/camera').CameraController
  getAudio(): import('../controllers/audio-recorder').AudioRecorderController
  getScreen(): import('../controllers/screen-capture').ScreenCaptureController
  /** drive browser controllers are core AdapterBrowserController instances, cached by FileSource. */
  getDrive(source: FileSource): AdapterBrowserController
  /** dispose every cached per-source controller (called on adapter switch + destroy). */
  disposeActive(): void
  /** dispose everything including fileInput + dragDrop (called on destroy). */
  disposeAll(): void
}

/** Resolved props (plain values, mirroring svelte ContextProps). */
export interface RootContextProps {
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
}

/** The flat root context every template fn receives. Replicates svelte createRootProvider data without core extraction. */
export interface RootContext {
  core: UpupCore
  orchestrator: UploaderOrchestrator
  theme: ThemeStore
  mode: 'client' | 'server'
  serverUrl: string | undefined
  translations: Translations
  translator: Translator
  lang: string
  dir: 'ltr' | 'rtl'
  props: RootContextProps
  cloudDrives: {
    googleDriveConfigs?: Record<string, string>
    oneDriveConfigs?: Record<string, string>
    dropboxConfigs?: Record<string, string>
    boxConfigs?: Record<string, string>
  }
  registerFileInput(el: HTMLInputElement | null): void
  getFileInput(): HTMLInputElement | null
  openFilePicker(): void
  setActiveAdapter(a: FileSource | undefined): void
  setIsAddingMore(v: boolean): void
  setViewMode(m: 'grid' | 'list'): void
  setFiles(files: File[]): Promise<void>
  handleFileRemove(fileId: string): void
  proceedUpload(): Promise<UploadFile[] | undefined>
  retryUpload(fileId?: string): Promise<UploadFile[] | undefined>
  handleDone(): void
  handleCancel(): void
  handlePause(): void
  handleResume(): void
  controllers: ControllerRegistry
  /** request a re-render (microtask-coalesced by the render loop). */
  invalidate(): void
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
