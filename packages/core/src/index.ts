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
export type { UploaderClassNames } from './types/class-names'
export type { UploadSource, UploadProvider } from './types/uploader-options'

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
export { bindAdapterEvents, type AdapterEventCallbacks } from './adapters/bind-adapter-events'
export type { DriveFile, DriveFolder, DriveUser, AdapterState, AdapterEventMap } from './adapters/types'
export type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs } from './adapters/configs'
export { DropboxPlugin } from './adapters/dropbox-plugin'
export { GoogleDrivePlugin } from './adapters/google-drive-plugin'
export { BoxPlugin } from './adapters/box-plugin'
export { OneDrivePlugin } from './adapters/one-drive-plugin'
export { AdapterBrowserController } from './adapters/adapter-browser-controller'
export type {
    AdapterBrowserState,
    AdapterBrowserCallbacks,
    DriveBrowserPlugin,
} from './adapters/adapter-browser-controller'
export {
    GOOGLE_DRIVE_DESCRIPTOR,
    ONE_DRIVE_DESCRIPTOR,
    DROPBOX_DESCRIPTOR,
    BOX_DESCRIPTOR,
} from './adapters/drive-browser-descriptors'
export type {
    AdapterProviderDescriptor,
    AdapterAuthKind,
    AdapterFolderKey,
    AdapterSelectFolderStrategy,
} from './adapters/drive-browser-descriptors'
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
