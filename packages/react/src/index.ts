'use client'

export {
    default as UpupUploader,
    type UpupUploaderRef,
} from './upup-uploader'

// Re-export v1 types for backward compat
export {
    type FileWithParams,
    type FileWithProgress,
    type GoogleDriveConfigs,
    type ImageEditorOptions,
    type OneDriveConfigs,
    type ResumableUploadOptions,
    type Translations,
    UploadAdapter,
    UpupProvider,
} from './shared/types'

// Re-export i18n
export { en_US } from './shared/i18n'

// Re-export the headless hook (v2 addition)
export { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'
