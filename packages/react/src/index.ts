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
