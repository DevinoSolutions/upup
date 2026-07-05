// @upup/core public barrel — the curated surface a library consumer is
// meant to construct or handle: `UpupCore` + its options, the error
// taxonomy, public value enums, the i18n and theme surfaces, the plugin
// authoring surface, and the primary public data types. Implementation
// machinery (engine collaborators, the orchestrator, controllers, context
// shapes, low-level utils) lives behind `@upup/core/internal` instead — see
// CLAUDE.md's "Package map" entry and packages/core/tests/public-api.test.ts
// for the pin that keeps this barrel from silently regrowing.

// ── Types (from ./types/) ────────────────────────────────────
export type {
    UploadFileMetadata,
    UploadFile,
    UploadFileWithProgress,
} from './types/upload-file'
export type { FileUploadResult } from './types/upload-result'
export { FileSource } from './types/file-source'
export {
    StorageProvider,
    NON_S3_STORAGE_PROVIDERS,
} from './types/storage-provider'
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
export type {
    UploadSource,
    UploadProvider,
} from './types/uploader-options'
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

// ── Contract interfaces (pipeline authoring surface) ─────────
export type {
    PipelineStep,
    PipelineContext,
} from './contracts-pipeline'

// ── i18n ─────────────────────────────────────────────────────
export {
    LOCALE_CODES,
    LOCALE_REGISTRY,
    enUS,
    arSA,
    deDE,
    esES,
    frFR,
    jaJP,
    koKR,
    zhCN,
    zhTW,
} from './i18n/locales/registry'
export type { RegisteredLocaleCode } from './i18n/locales/registry'
export type {
    UpupMessages,
    LocaleBundle,
    UpupLocaleCode,
    PartialMessages,
    Translator,
} from './i18n/types'
export { createTranslator } from './i18n/create-translator'
export type { TranslatorOptions } from './i18n/create-translator'
export { LOCALE_META, normalizeBcp47 } from './i18n/locale-meta'
export type { LocaleMeta } from './i18n/locale-meta'
export {
    flattenTranslatorToUiTranslations,
    formatUiMessage,
    pluralUiMessage,
} from './i18n/ui-translations'
export type {
    Translations,
    UiTranslations,
} from './i18n/ui-translations'
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
} from './theme/types'
export { lightPreset, darkPreset } from './theme/presets'
export { resolveTheme } from './theme/resolve-theme'
export { UPUP_VAR_PREFIX, tokensToVars } from './theme/vars'
export type {
    UpupThemeSlots,
    UpupSlotPath,
} from './theme/slots'
export { flattenSlotsToClassNames } from './theme/slots'

// ── Core ─────────────────────────────────────────────────────
export { UpupCore } from './core'
export type {
    CoreOptions,
    UploadOptions,
    ValidationResult,
    CloudDrivesConfig,
    UpupCorsConfig,
} from './core'

// ── Plugin authoring surface ──────────────────────────────────
export type { UpupPlugin, ExtensionMethods } from './plugin'
export type { DrivePlugin } from './drives/plugin'
export { PopupOAuthPlugin } from './drives/popup-oauth-plugin'
export type { PopupOAuthSpec } from './drives/popup-oauth-plugin'
export type {
    DriveFile,
    DriveFolder,
    DriveUser,
    DriveState,
    DriveEventMap,
    DriveBrowserError,
    DriveListPage,
} from './drives/types'
export type {
    GoogleDriveConfig,
    OneDriveConfig,
    DropboxConfig,
    BoxConfig,
} from './drives/configs'
export { DropboxPlugin } from './drives/dropbox-plugin'
export { GoogleDrivePlugin } from './drives/google-drive-plugin'
export { BoxPlugin } from './drives/box-plugin'
export { OneDrivePlugin } from './drives/one-drive-plugin'
export {
    GOOGLE_DRIVE_DESCRIPTOR,
    ONE_DRIVE_DESCRIPTOR,
    DROPBOX_DESCRIPTOR,
    BOX_DESCRIPTOR,
} from './drives/drive-browser-descriptors'

// ── Public data types ──────────────────────────────────────────
export type { ObservableController } from './controllers/types'
export type {
    ServerModeProvider,
    ServerDriveFile,
    ServerDriveListState,
} from './controllers/server-mode-drive-controller'
export type {
    FileProgress,
    FilesProgressMap,
} from './file-utils'

// ── Shared utilities ─────────────────────────────────────
export { ACCEPT_PRESETS, resolveAccept } from './utils/accept-presets'
export type {
    AcceptPreset,
    AcceptPresetDefinition,
} from './utils/accept-presets'

// ── Icons ─────────────────────────────────────────────────────
export { ICONS } from './icons/registry'
export type { IconName, IconDef } from './icons/registry'
export { fileTypeIconName } from './icons/file-type-icon'
export { FILE_TYPE_EXTENSIONS } from './icons/file-type-icons'
export type { FileTypeIconName } from './icons/file-type-icons'
