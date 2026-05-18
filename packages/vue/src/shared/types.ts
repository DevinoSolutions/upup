import type { Component } from 'vue'
import type {
    FileSource,
    LocaleBundle,
    MaxFileSizeObject,
    MultipartAbortResponse,
    MultipartCompleteResponse,
    MultipartInitResponse,
    MultipartListPartsResponse,
    MultipartPart,
    MultipartSignPartResponse,
    PartialMessages,
    PresignedUrlResponse,
    ResumableUploadOptions,
    StorageProvider,
    Translations,
    UploadFile,
    UpupThemeConfig,
    GoogleDriveConfigs,
    OneDriveConfigs,
    DropboxConfigs,
    BoxConfigs,
} from '@upup/core'

export type { Translations }
export type {
    GoogleDriveConfigs,
    OneDriveConfigs,
    DropboxConfigs,
    BoxConfigs,
}
export type {
    MaxFileSizeObject,
    MultipartAbortResponse,
    MultipartCompleteResponse,
    MultipartInitResponse,
    MultipartListPartsResponse,
    MultipartPart,
    MultipartSignPartResponse,
    PresignedUrlResponse,
    ResumableUploadOptions,
}

/**
 * Configuration for the optional image editor.
 */
export type ImageEditorOptions = {
    enabled?: boolean
    display?: 'inline' | 'modal'
    autoOpen?: 'never' | 'single' | 'always'
    output?: {
        mimeType?: string
        quality?: number
        fileName?: (original: File) => string
    }
    tabs?: (
        | 'Adjust'
        | 'Annotate'
        | 'Filters'
        | 'Finetune'
        | 'Resize'
        | 'Watermark'
    )[]
    tools?: (
        | 'Crop'
        | 'Rotate'
        | 'Flip'
        | 'Brightness'
        | 'Contrast'
        | 'HSV'
        | 'Blur'
        | 'Text'
        | 'Line'
        | 'Rect'
        | 'Ellipse'
        | 'Polygon'
        | 'Pen'
        | 'Arrow'
        | 'Image'
    )[]
    onOpen?: (file: UploadFile) => void
    onCancel?: (file: UploadFile) => void
    onSave?: (editedFile: UploadFile, originalFile: UploadFile) => void
}

/** Resolved image editor config with all defaults applied. */
export type ResolvedImageEditorOptions = Required<
    Pick<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>
> &
    Omit<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>

export type UpupUploaderPropsIcons = {
    ContainerAddMoreIcon?: Component
    FileDeleteIcon?: Component
    CameraDeleteIcon?: Component
    CameraCaptureIcon?: Component
    CameraRotateIcon?: Component
    LoaderIcon?: Component
}

/** Canonical source IDs accepted by the uploader. */
export type UploadSource =
    | FileSource
    | 'local'
    | 'url'
    | 'camera'
    | 'microphone'
    | 'screen'
    | 'googleDrive'
    | 'oneDrive'
    | 'dropbox'
    | 'box'

export type UploadProvider = StorageProvider | (string & {})

export type UpupUploaderProps = {
    provider?: UploadProvider
    mode?: 'client' | 'server'
    sources?: UploadSource[]
    uploadEndpoint?: string
    serverUrl?: string
    maxFiles?: number
    restrictions?: {
        maxFileSize?: MaxFileSizeObject
        minFileSize?: MaxFileSizeObject
        maxTotalFileSize?: MaxFileSizeObject
        maxNumberOfFiles?: number
        allowedFileTypes?: string[]
    }
    theme?: UpupThemeConfig
    folderUpload?: {
        allowDrop?: boolean
        showSelectFolderButton?: boolean
    }
    cors?: {
        dangerouslyAutoConfigure?: boolean
        allowedOrigins: string[]
        allowedMethods?: string[]
        allowedHeaders?: string[]
        maxAgeSeconds?: number
    }
    cloudDrives?: {
        googleDrive?: { clientId: string; apiKey: string; appId: string }
        oneDrive?: { clientId: string; redirectUri?: string }
        dropbox?: { clientId: string; redirectUri?: string }
        box?: { clientId: string; redirectUri?: string }
    }
    imageCompression?: boolean
    thumbnailGenerator?: boolean
    checksumVerification?: boolean
    heicConversion?: boolean
    stripExifData?: boolean
    contentDeduplication?: boolean
    autoUpload?: boolean
    maxConcurrentUploads?: number
    crashRecovery?: boolean
    allowedFileTypes?: string | string[]
    allowPreview?: boolean
    showBranding?: boolean
    disableDragDrop?: boolean
    className?: string
    style?: Record<string, string>
    isProcessing?: boolean
    mini?: boolean
    maxFileSize?: MaxFileSizeObject
    minFileSize?: MaxFileSizeObject
    maxTotalFileSize?: MaxFileSizeObject
    imageEditor?: boolean | ImageEditorOptions
    metadata?: Record<string, unknown>
    maxRetries?: number
    resumable?: ResumableUploadOptions
    icons?: UpupUploaderPropsIcons

    i18n?: {
        bundle?: LocaleBundle
        locale?: LocaleBundle | string
        fallbackLocale?: LocaleBundle | string
        overrides?: PartialMessages
    }

    onFilesSelected?: (files: UploadFile[]) => void
    onDoneClicked?: () => void
    onPrepareFiles?: (files: UploadFile[]) => Promise<UploadFile[]>
    onFileClick?: (file: UploadFile) => void
    onIntegrationClick?: (integrationType: string) => void
    onFileUploadStart?: (file: UploadFile) => void
    onFileUploadComplete?: (file: UploadFile, key: string) => void
    onFilesUploadComplete?: (files: UploadFile[]) => void
    onFileUploadProgress?: (
        file: UploadFile,
        progress: { loaded: number; total: number; percentage: number },
    ) => void
    onFilesUploadProgress?: (completedFiles: number, totalFiles: number) => void
    onFileRemove?: (file: UploadFile) => void
    onUploadStart?: () => void
    onUploadComplete?: (files: UploadFile[]) => void
    onStatusChange?: (status: string) => void
    onFileRemoved?: (file: UploadFile) => void
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    onRestrictionFailed?: (file: File, reason: 'TYPE_MISMATCH' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'LIMIT_EXCEEDED') => void
    enablePaste?: boolean
    onBeforeFileAdded?: (file: File) => boolean | File | undefined | Promise<boolean | File | undefined>
    onError?: (errorMessage: string) => void
    onWarn?: (warningMessage: string) => void
    processingEndpoint?: string
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
    processingTimeout?: number
}

export { UploadErrorType, UploadError } from '@upup/core'
