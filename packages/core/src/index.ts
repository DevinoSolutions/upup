// ── Types (from ./types/) ────────────────────────────────────
export type {
    BaseContextUpload,
    BaseContextRuntime,
    BaseContextSource,
    BaseContextI18n,
    BaseContextFiles,
    BaseContextUploadControls,
    BaseContextView,
    BaseContextEditor,
    BaseContextTheme,
} from './types/context-shapes'
export type { UploadFileMetadata, UploadFile, UploadFileWithProgress } from './types/upload-file'
export type { FileUploadResult } from './types/upload-result'
export { FileSource } from './types/file-source'
export { StorageProvider } from './types/storage-provider'
export { UploadStatus } from './types/upload-status'
export type {
  PresignedUrlResponse,
  MultipartInitResponse,
  MultipartSignPartResponse,
  MultipartPart,
  MultipartListPartsResponse,
  MultipartCompleteResponse,
  MultipartAbortResponse,
  MaxFileSizeObject,
  ResumableUploadOptions,
  CrashRecoveryOptions,
} from './types/upload-protocols'
export type {
  ImageEditorOptions,
  ResolvedImageEditorOptions,
  ImageCompressionOptions,
  ThumbnailGeneratorOptions,
} from './types/image-editor'
export type { UploadSource, UploadProvider } from './types/uploader-options'
export type { UploaderBaseProps } from './types/uploader-props'

// ── Errors ───────────────────────────────────────────────────
export {
  UpupErrorCode,
  UpupError,
  UpupAuthError,
  UpupNetworkError,
  UpupValidationError,
  UpupQuotaError,
  UpupStorageError,
  UpupConfigError,
  UploadErrorType,
  UploadError,
} from './errors'
export type { RestrictionFailedReason } from './errors'

// ── Contract interfaces (strategies + pipeline) ──────────────
export type {
  FileMetadata,
  UploadCredentials,
  UploadResult,
  ProgressInfo,
  OAuthTokens,
  RemoteFile,
  CloudProvider,
  CredentialStrategy,
  OAuthStrategy,
  UploadStrategy,
  RuntimeAdapter,
} from './contracts-strategies'
export type { PipelineStep, PipelineContext } from './contracts-pipeline'

// ── i18n ─────────────────────────────────────────────────────
export { enUS } from './i18n/locales/en-US'
export { arSA } from './i18n/locales/ar-SA'
export { deDE } from './i18n/locales/de-DE'
export { esES } from './i18n/locales/es-ES'
export { frFR } from './i18n/locales/fr-FR'
export { jaJP } from './i18n/locales/ja-JP'
export { koKR } from './i18n/locales/ko-KR'
export { zhCN } from './i18n/locales/zh-CN'
export { zhTW } from './i18n/locales/zh-TW'
export type {
  UpupMessages,
  LocaleBundle,
  UpupLocaleCode,
  FlatMessageKey,
  PartialMessages,
  MessageNamespace,
  Translator,
} from './i18n/types'
export { createTranslator } from './i18n/create-translator'
export type { TranslatorOptions } from './i18n/create-translator'
export { buildFallbackChain, resolveMessage } from './i18n/resolve-locale'
export { LOCALE_META, normalizeBcp47 } from './i18n/locale-meta'
export type { LocaleMeta } from './i18n/locale-meta'
export {
  flattenTranslatorToUiTranslations,
  formatUiMessage,
  pluralUiMessage,
} from './i18n/ui-translations'
export type { Translations, UiTranslations } from './i18n/ui-translations'
export { mergeTranslations, plural, t } from './i18n/utils'
export { errorCodeToMessageKey } from './i18n/error-code-map'

// ── Theme ────────────────────────────────────────────────────
export type {
  UpupColorTokens,
  UpupRadiusTokens,
  UpupShadowTokens,
  UpupSpacingTokens,
  UpupThemeTokens,
  UpupThemeMode,
  UpupThemeConfig,
  UpupResolvedTheme,
  DeepPartial,
} from './theme/types'
export { lightPreset, darkPreset } from './theme/presets'
export { resolveTheme } from './theme/resolve-theme'
export { UPUP_VAR_PREFIX, tokensToVars, tokensToVarRefs } from './theme/vars'
export type {
  UpupThemeSlots,
  UpupSlotPath,
  DeepPartialSlots,
  InternalFlatClassNames,
} from './theme/slots'
export { flattenSlotsToClassNames } from './theme/slots'
export { ThemeStore } from './theme/theme-store'
export type { ThemeStoreState } from './theme/theme-store'
export { UpupCore } from './core'
export type { CoreOptions, UploadOptions, ValidationResult, CloudDrivesConfig, UpupCorsConfig } from './core'
export { EventEmitter } from './events'
export type { CoreEvents } from './types/core-events'
export { PluginManager } from './plugin'
export type { UpupPlugin, ExtensionMethods } from './plugin'
export { FileManager } from './file-manager'
export { PipelineEngine } from './pipeline/engine'
export { DirectUpload } from './strategies/direct-upload'
export { TokenEndpointCredentials } from './strategies/token-endpoint'
export { BrowserRuntime } from './runtime/browser'
export { UploadManager } from './upload-manager'
export type { UploadManagerOptions } from './upload-manager'
export { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
export type { PersistentStorage } from './crash-recovery'
export type { DrivePlugin } from './drives/plugin'
export { bindDriveEvents, type DriveEventCallbacks } from './drives/bind-drive-events'
export type {
    DriveFile,
    DriveFolder,
    DriveUser,
    DriveState,
    DriveEventMap,
    DriveBrowserError,
    DriveListPage,
} from './drives/types'
export type { GoogleDriveConfig, OneDriveConfig, DropboxConfig, BoxConfig } from './drives/configs'
export { DropboxPlugin } from './drives/dropbox-plugin'
export { GoogleDrivePlugin } from './drives/google-drive-plugin'
export { BoxPlugin } from './drives/box-plugin'
export { OneDrivePlugin } from './drives/one-drive-plugin'
export { DriveBrowserController } from './drives/drive-browser-controller'
export type {
    DriveBrowserState,
    DriveBrowserCallbacks,
} from './drives/drive-browser-controller'
export type { ObservableController } from './controllers/types'
export { DragDropController } from './controllers/drag-drop-controller'
export type {
  DragDropDeps, DragDropOptions, DragDropProps, DragDropSnapshot,
} from './controllers/drag-drop-controller'
export { ServerModeDriveController } from './controllers/server-mode-drive-controller'
export type {
  ServerModeProvider, ServerDriveFile, ServerDriveListState,
  ServerDriveTransferResult, ServerDriveSnapshot, ServerModeDriveDeps,
} from './controllers/server-mode-drive-controller'
export {
    GOOGLE_DRIVE_DESCRIPTOR,
    ONE_DRIVE_DESCRIPTOR,
    DROPBOX_DESCRIPTOR,
    BOX_DESCRIPTOR,
} from './drives/drive-browser-descriptors'
export type {
    DriveProviderDescriptor,
    DriveAuthKind,
    DriveFolderKey,
    DriveSelectFolderStrategy,
} from './drives/drive-browser-descriptors'
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

// ── Orchestrator ─────────────────────────────────────────
export { UploaderOrchestrator } from './orchestrator/uploader-orchestrator'
export type { OrchestratorState, OrchestratorCallbacks, UploadProgressInfo } from './orchestrator/types'
export { getDir, normalizeSource, DEFAULT_SOURCES, DEFAULT_MAX_FILE_SIZE } from './orchestrator/helpers'

// ── Root composition factory (C-2) ───────────────────────
export * from './uploader'

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

// ── Icons ─────────────────────────────────────────────────────
export { ICONS } from './icons/registry'
export type { IconName, IconDef } from './icons/registry'
export { fileTypeIconName } from './icons/file-type-icon'
export { FILE_TYPE_EXTENSIONS } from './icons/file-type-icons'
export type { FileTypeIconName } from './icons/file-type-icons'
