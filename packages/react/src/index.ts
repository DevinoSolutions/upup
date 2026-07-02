'use client'

// ── Core component + ref ─────────────────────────────────
export { default as UpupUploader, type UploaderRef } from './upup-uploader'

// ── Headless hook (v2) ───────────────────────────────────
export { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'

// ── Headless context hooks (parity with @upup/vue and @upup/svelte) ──
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
export { FileSource, StorageProvider } from '@upup/core'

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
} from '@upup/core'
export type { UploaderProps, UploaderIcons } from './shared/types'

// ── v2 core contract re-exports ───────────────────────
export type {
    UploadFile,
    UploadFileWithProgress,
    UploadStatus,
    UpupThemeSlots,
    DeepPartialSlots,
    UpupSlotPath,
} from '@upup/core'

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
export { ACCEPT_PRESETS, resolveAccept } from '@upup/core'
export type { AcceptPreset, AcceptPresetDefinition } from '@upup/core'

// ── Theme ────────────────────────────────────────────────
export { UpupThemeProvider } from './theme'
