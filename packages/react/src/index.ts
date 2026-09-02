'use client'

// ── Core component + ref ─────────────────────────────────
export { default as UpupUploader, type UploaderRef } from './upup-uploader'

// ── Headless hook (v2) ───────────────────────────────────
export { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'

// ── Headless context hooks (parity with @useupup/vue and @useupup/svelte) ──
export {
    useUploaderContext,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderI18n,
    useUploaderFiles,
    useUploaderUploadControls,
    useUploaderView,
    useUploaderEditor,
    useUploaderOptions,
    useUploaderTheme,
} from './context/UploaderContext'

export type {
    IUploaderContext,
    ContextRuntime,
    ContextSource,
    ContextI18n,
    ContextFiles,
    ContextUploadControls,
    ContextView,
    ContextEditor,
    ContextTheme,
    ContextProps,
    ContextUpload,
} from './context/UploaderContext'

// ── Canonical shared enums/types ─────────────────────────
export { FileSource, StorageProvider } from '@useupup/core'

// ── Error taxonomy (#339) ────────────────────────────────
// Re-exported verbatim from @useupup/core so catching a typed upload error
// doesn't force a react-only consumer to add a direct @useupup/core dependency —
// the error-handling docs point at these names, and `error` on the hook's
// return value is already an `UpupError | null`. They are the SAME class
// objects core exports, so `instanceof` narrows identically whichever package
// you import from (pinned by tests/error-exports.test.ts).
export {
    UpupErrorCode,
    UpupError,
    UpupAuthError,
    UpupNetworkError,
    UpupValidationError,
    UpupQuotaError,
    UpupStorageError,
    UpupConfigError,
    uploadErrorFromResponse,
} from '@useupup/core'
export type { RestrictionFailedReason } from '@useupup/core'

// ── React types ──────────────────────────────────────────
export type {
    ImageEditorOptions,
    ResolvedImageEditorOptions,
    UploadSource,
    UploadProvider,
    GoogleDriveConfig,
    OneDriveConfig,
    DropboxConfig,
    BoxConfig,
    CloudDrivesConfig,
    ResumableUploadOptions,
} from '@useupup/core'
export type { UploaderProps, UploaderIcons } from './shared/types'

// ── v2 core contract re-exports ───────────────────────
export type {
    UploadFile,
    UploadFileWithProgress,
    UploadStatus,
    UpupThemeSlots,
    UpupSlotPath,
} from '@useupup/core'
export type { DeepPartialSlots } from '@useupup/core/internal'

// ── Brand icons (authentic colours, matches uploader adapter buttons) ──
export {
    MyDeviceIcon,
    BoxIcon,
    DropboxIcon,
    GoogleDriveIcon,
    OneDriveIcon,
    LinkIcon,
    CameraIcon,
    AudioIcon,
    ScreenCaptureIcon,
} from './components/Icons'

// ── Accept presets ──────────────────────────────────────
export { ACCEPT_PRESETS, resolveAccept } from '@useupup/core'
export type { AcceptPreset, AcceptPresetDefinition } from '@useupup/core'

// ── Theme ────────────────────────────────────────────────
export { UpupThemeProvider } from './theme'
