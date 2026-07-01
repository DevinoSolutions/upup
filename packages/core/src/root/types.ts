import type { UpupCore, CoreOptions } from '../core'
import type { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { OrchestratorCallbacks } from '../orchestrator/types'
import type { ThemeStore } from '../theme/theme-store'
import type { UpupThemeConfig } from '../theme/types'
import type { FileSource } from '../types/file-source'
import type { ResolvedImageEditorOptions, ImageEditorOptions } from '../types/image-editor'
import type { UploadFile } from '../types/upload-file'
import type { Translator, LocaleBundle, PartialMessages } from '../i18n/types'
import type { UiTranslations } from '../i18n/ui-translations'
import type { ResumableUploadOptions } from '../types/upload-protocols'

/** Framework-facing cloud-drive config (adds redirectUri vs core CloudDrivesConfig). */
export interface RootCloudDrivesConfig {
  googleDrive?: { clientId: string; apiKey: string; appId: string }
  oneDrive?: { clientId: string; redirectUri?: string }
  dropbox?: { clientId: string; redirectUri?: string }
  box?: { clientId: string; redirectUri?: string }
}

/** i18n option block (identical across adapters). */
export interface RootI18nOptions {
  bundle?: LocaleBundle
  locale?: LocaleBundle | string
  fallbackLocale?: LocaleBundle | string
  overrides?: PartialMessages
}

/** Every callback the orchestrator/commands/proxy may invoke (framework-agnostic superset). */
export interface RootCallbacks extends OrchestratorCallbacks {
  // convenience (core-event bridges; wired by the host's upload hook, not the factory)
  onFileAdded?: (files: UploadFile[]) => void
  onUploadProgress?: (p: { fileId: string; loaded: number; total: number }) => void
  // restriction / status (read by commands + status-change)
  onStatusChange?: (status: string) => void
  onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
  onRestrictionFailed?: (file: File, reason: 'TYPE_MISMATCH' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'LIMIT_EXCEEDED') => void
  // removal (both v1 `onFileRemove` and v2 `onFileRemoved`; deduped if same ref)
  onFileRemove?: (file: UploadFile) => void
  onDoneClicked?: () => void
  autoUpload?: boolean
}

/** Options accepted by the factory (framework-agnostic superset; each framework's props satisfy this structurally). */
export interface RootControllerOptions extends Omit<CoreOptions, 'cloudDrives' | 'onError'>, RootCallbacks {
  dark?: boolean
  theme?: UpupThemeConfig
  sources?: Array<FileSource | string>
  mini?: boolean
  isProcessing?: boolean
  allowPreview?: boolean
  showBranding?: boolean
  disableDragDrop?: boolean
  className?: string
  folderUpload?: { allowDrop?: boolean; showSelectFolderButton?: boolean }
  imageEditor?: boolean | ImageEditorOptions
  enablePaste?: boolean
  resumable?: ResumableUploadOptions
  i18n?: RootI18nOptions
  cloudDrives?: RootCloudDrivesConfig
  onIntegrationClick?: (sourceId: string) => void
  onPrepareFiles?: (files: UploadFile[]) => Promise<UploadFile[]>
  maxFiles?: number
}

/** Framework-facing cloud-config maps (consumed by plugins + adapter browser). */
export interface RootCloudConfigMaps {
  googleDriveConfigs?: { google_client_id: string; google_api_key: string; google_app_id: string }
  oneDriveConfigs?: { onedrive_client_id: string; redirectUri: string }
  dropboxConfigs?: { dropbox_client_id: string; dropbox_redirect_uri: string }
  boxConfigs?: { box_client_id: string; box_redirect_uri: string }
}

/** All resolved scalars + i18n + cloud-config maps (static, computed once). */
export interface RootResolved extends RootCloudConfigMaps {
  mini: boolean
  sources: FileSource[]
  allowedFileTypes: string
  limit: number
  maxFileSize: import('../contracts').MaxFileSizeObject
  multiple: boolean
  mode: 'client' | 'server'
  serverUrl?: string
  folderUploadAllowDrop: boolean
  folderPickerButtonVisible: boolean
  imageEditor: ResolvedImageEditorOptions
  resumable?: ResumableUploadOptions
  translator: Translator
  translations: UiTranslations
  lang: string
  dir: 'ltr' | 'rtl'
}

/** Output of the pure normalizer: the CoreOptions object to build core with, plus all resolved values. */
export interface NormalizedRootOptions {
  coreOptions: CoreOptions
  resolved: RootResolved
}

/** Imperative command surface (delegates to core + orchestrator). */
export interface RootCommands {
  handleSetSelectedFiles(newFiles: File[]): Promise<void>
  handleFileRemove(fileId: string): void
  handleRemoveAll(): void
  uploadFiles(newFiles: File[] | UploadFile[]): Promise<UploadFile[] | undefined>
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
  setActiveAdapter(adapter: FileSource | undefined): void
  setIsAddingMore(value: boolean): void
  setViewMode(mode: 'grid' | 'list'): void
}

/** Optional host injection points. */
export interface RootHostHooks {
  /** Per-framework SSE wiring; called for each completed file in onFilesUploadComplete. Vanilla omits. */
  connectSSE?: (file: UploadFile) => void
  /** Manual render-loop nudge (vanilla). Adapters with reactive bridges omit. */
  invalidate?: () => void
}

/** Parameters for the factory: the host-created core, the raw options, and the precomputed normalization. */
export interface CreateRootControllerParams {
  core: UpupCore
  options: RootControllerOptions
  normalized: NormalizedRootOptions
}

/** Stable handle returned by the factory. */
export interface RootController {
  core: UpupCore
  orchestrator: UploaderOrchestrator
  theme: ThemeStore
  resolved: RootResolved
  commands: RootCommands
  registerFileInput(el: HTMLInputElement | null): void
  getFileInput(): HTMLInputElement | null
  openFilePicker(): void
  /** Refresh the proxied callbacks (React calls every render; others once). */
  updateCallbacks(callbacks: RootCallbacks): void
  /** Optional fan-in of core `state-change` + orchestrator + theme notifications. */
  subscribe(listener: () => void): () => void
  /** Idempotent: orchestrator.init + theme.init + plugin registration + crash recovery + status-change. */
  init(): void
  /** Idempotent + re-entrant: reverse of init; safe for Angular config rebuild. */
  dispose(): void
}
