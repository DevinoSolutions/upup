export * from './contracts'
export * from './i18n'
export * from './theme'
export { UpupCore } from './core'
export type { CoreOptions, UploadOptions, ValidationResult, Restrictions, CloudDrivesConfig, UpupCorsConfig } from './core'
export { EventEmitter } from './events'
export type { CoreEvents } from './types/core-events'
export { PluginManager } from './plugin'
export type { UpupPlugin, ExtensionMethods } from './plugin'
export { composeEnhancers } from './compose-enhancers'
export type { CoreEnhancer } from './compose-enhancers'
export { FileManager } from './file-manager'
export { PipelineEngine } from './pipeline/engine'
export { DirectUpload } from './strategies/direct-upload'
export { TokenEndpointCredentials } from './strategies/token-endpoint'
export { BrowserRuntime } from './runtime/browser'
export { UploadManager } from './upload-manager'
export type { UploadManagerOptions } from './upload-manager'
export { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
export type { PersistentStorage } from './crash-recovery'
export type { AdapterPlugin } from './adapters/plugin'
export type { DriveFile, DriveFolder, DriveUser, AdapterState, AdapterEventMap } from './adapters/types'
export type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs } from './adapters/configs'
export { DropboxPlugin } from './adapters/dropbox-plugin'
export { GoogleDrivePlugin } from './adapters/google-drive-plugin'
export { BoxPlugin } from './adapters/box-plugin'
export { OneDrivePlugin } from './adapters/one-drive-plugin'
export type { DroppedFilesResult } from './folder-drop'
export { collectDroppedFiles } from './folder-drop'
export {
  bytesToSize,
  sizeToBytes,
  checkFileSize,
  PREVIEW_MAX_TEXT_SIZE,
  PREVIEW_TEXT_TRUNCATE_LENGTH,
  fileGetIsImage,
  fileGetIsPdf,
  fileGetIsText,
  fileCanPreviewText,
  fileGetExtension,
  fileIs3D,
  searchDriveFiles,
} from './file-utils'
export type { FileProgress, FilesProgressMap } from './file-utils'
export { SSEProcessor } from './sse-processor'

// ── Shared utilities ─────────────────────────────────────
export { ACCEPT_PRESETS, resolveAccept } from './utils/accept-presets'
export type { AcceptPreset, AcceptPresetDefinition } from './utils/accept-presets'
export { isUploadActive, isUploadIdle } from './utils/status-helpers'
export { b64EncodeUnicode } from './utils/encoder'
export { fileAppendParams, revokeFileUrl } from './utils/file-helpers'
export { cn } from './utils/tailwind'
export { sourceNameKeys } from './utils/source-metadata'
export { dataURLtoBlob, blobToUploadFile, revokeAndReplace } from './utils/image-helpers'
export {
    saveSession,
    loadSession,
    removeSession,
    updateSessionProgress,
    clearAllSessions,
    fileFingerprint,
} from './utils/multipart-session-store'
export type { MultipartSession } from './utils/multipart-session-store'
export {
    MIME_EXTENSION_MAP, sanitizeFileName, extensionFromMime,
    fileNameFromContentDisposition, deriveFetchedFileName,
} from './utils/fetch-helpers'
export { loadGoogleIdentityServices } from './utils/load-gapi'
