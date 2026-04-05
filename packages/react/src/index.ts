'use client'

// ── Core component + ref ─────────────────────────────────
export {
    default as UpupUploader,
    type UpupUploaderRef,
} from './upup-uploader'

// ── Headless hook (v2) ───────────────────────────────────
export { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'

// ── Enums ────────────────────────────────────────────────
export { UploadAdapter, UpupProvider } from './shared/types'
export { FileSource } from '@upup/shared'
/** v2 alias for UpupProvider */
export { UpupProvider as StorageProvider } from './shared/types'

// ── v1 Types (backward compat) ──────────────────────────
export type {
    FileWithParams,
    FileWithProgress,
    GoogleDriveConfigs,
    OneDriveConfigs,
    DropboxConfigs,
    ImageEditorOptions,
    ResumableUploadOptions,
    Translations,
    UploadSource,
    UpupUploaderProps,
    UpupUploaderPropsClassNames,
    UpupUploaderPropsIcons,
} from './shared/types'

// ── v2 Type aliases ─────────────────────────────────────
export type {
    FileWithParams as UploadFile,
    FileWithProgress as UploadFileWithProgress,
} from './shared/types'

// ── v2 re-exports from @upup/shared ─────────────────────
export type { UploadStatus } from '@upup/shared'

// ── i18n ─────────────────────────────────────────────────
export { en_US } from './shared/i18n'
