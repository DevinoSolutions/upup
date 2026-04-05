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
// v2 alias
export { FileSource } from '@upup/shared'

// ── Types ────────────────────────────────────────────────
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

// ── i18n ─────────────────────────────────────────────────
export { en_US } from './shared/i18n'
