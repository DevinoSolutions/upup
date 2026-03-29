export { useUpupUpload } from './use-upup-upload'
export type { UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'
export { UpupUploader } from './upup-uploader'
export type { UpupUploaderProps, UpupUploaderRef } from './upup-uploader'
export { PasteZone } from './components/paste-zone'
export type { PasteZoneProps } from './components/paste-zone'
export { UploaderContext, useUploaderContext } from './context/uploader-context'
export type { UploadSource, UploaderContextValue } from './context/uploader-context'

// Core UI components (migrated from v1)
export { default as DropZone } from './components/drop-zone'
export type { DropZoneProps } from './components/drop-zone'
export { default as SourceSelector } from './components/source-selector'
export type { SourceSelectorProps } from './components/source-selector'
export { default as SourceView } from './components/source-view'
export type { SourceViewProps } from './components/source-view'
export { default as FileList } from './components/file-list'
export type { FileListProps } from './components/file-list'
export { default as ProgressBar } from './components/progress-bar'
export { default as Notifier } from './components/notifier'
export type { InformerMessage, InformerMessageType, UseInformerReturn } from './hooks/use-informer'

// Device capture components (migrated from v1)
export { default as CameraUploader } from './components/camera-uploader'
export { default as AudioUploader } from './components/audio-uploader'
export { default as ScreenCaptureUploader } from './components/screen-capture-uploader'
export { default as UrlUploader } from './components/url-uploader'
export { default as useCameraUploader } from './hooks/use-camera-uploader'
export type { CameraMode, FacingMode } from './hooks/use-camera-uploader'
export { default as useAudioUploader } from './hooks/use-audio-uploader'
export { default as useScreenCapture } from './hooks/use-screen-capture'
export { default as useFetchFileByUrl } from './hooks/use-fetch-file-by-url'

// Cloud drive adapter components (migrated from v1)
export { default as GoogleDriveUploader } from './adapters/google-drive-uploader'
export { default as OneDriveUploader } from './adapters/onedrive-uploader'
export { default as DropboxUploader } from './adapters/dropbox-uploader'

// Shared drive browser components
export { default as DriveBrowser } from './components/shared/drive-browser'
export { default as DriveBrowserHeader } from './components/shared/drive-browser-header'
export { default as DriveBrowserIcon } from './components/shared/drive-browser-icon'
export { default as DriveBrowserItem } from './components/shared/drive-browser-item'
export { default as DriveAuthFallback } from './components/shared/drive-auth-fallback'
export { default as MainBoxHeader } from './components/shared/main-box-header'

// Cloud drive hooks
export { default as useGoogleDrive } from './hooks/use-google-drive'
export type { GoogleDriveConfigs } from './hooks/use-google-drive'
export { default as useGoogleDriveUploader } from './hooks/use-google-drive-uploader'
export { default as useOneDrive } from './hooks/use-onedrive'
export type { OneDriveConfigs } from './hooks/use-onedrive'
export { default as useOneDriveUploader } from './hooks/use-onedrive-uploader'
export { useDropbox } from './hooks/use-dropbox'
export { default as useDropboxUploader } from './hooks/use-dropbox-uploader'
export { useDropboxAuth } from './hooks/use-dropbox-auth'
export type { DropboxConfigs } from './hooks/use-dropbox-auth'
export { default as useLoadGAPI } from './hooks/use-load-gapi'

// Drive utility types and functions
export type {
    GoogleFile,
    GoogleRoot,
    GoogleUser,
    GoogleToken,
    OneDriveFile,
    OneDriveRoot,
    MicrosoftUser,
    DropboxFile,
    DropboxRoot,
    DropboxUser,
} from './lib/google-drive-utils'
export {
    getWorkspaceExportInfo,
    getDriveEffectiveExtension,
    isDriveFileAccepted,
    GOOGLE_WORKSPACE_EXPORTS,
} from './lib/google-drive-utils'

// File preview components (migrated from v1)
export { default as FilePreview } from './components/file-preview'
export { default as FilePreviewPortal } from './components/file-preview-portal'
export { default as FilePreviewThumbnail } from './components/file-preview-thumbnail'
export { default as ImageEditorInline } from './components/image-editor-inline'
export { default as ImageEditorModal } from './components/image-editor-modal'

// Image editor helpers
export {
    dataURLtoBlob,
    blobToUploadFile,
    revokeAndReplace,
    getFilerobotTheme,
    getImageEditorCssOverrides,
} from './lib/image-editor-helpers'

// Lib utilities
export { cn } from './lib/tailwind'
export { adapterNameKeys, uploadAdapterObject } from './lib/constants'
export type { AdapterEntry } from './lib/constants'
export {
    bytesToSize,
    sizeToBytes,
    fileAppendParams,
    revokeFileUrl,
    computeFileHash,
    computeFullContentHash,
    compressFile,
    convertHeicFile,
    stripExifData,
    compressImageFile,
    generateThumbnailForFile,
    searchDriveFiles,
    fileGetIsImage,
    fileGetIsVideo,
    fileGetIsText,
    fileCanPreviewText,
    fileGetExtension,
    fileIs3D,
    THUMBNAIL_DEFAULTS,
    PREVIEW_MAX_TEXT_SIZE,
    PREVIEW_TEXT_TRUNCATE_LENGTH,
} from './lib/file'
export type { ImageCompressionOptions, ThumbnailGeneratorOptions } from './lib/file'
