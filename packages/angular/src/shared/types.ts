import type { Type } from '@angular/core'
import type {
    ImageEditorOptions,
    LocaleBundle,
    MaxFileSizeObject,
    PartialMessages,
    ResumableUploadOptions,
    UploadFile,
    UploadProvider,
    UploadSource,
    UpupThemeConfig,
} from '@upup/core'

export type UploaderIcons = {
    ContainerAddMoreIcon?: Type<unknown>
    FileDeleteIcon?: Type<unknown>
    CameraDeleteIcon?: Type<unknown>
    CameraCaptureIcon?: Type<unknown>
    CameraRotateIcon?: Type<unknown>
    LoaderIcon?: Type<unknown>
}

export type UploaderProps = {
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
    /** v2: Offload the file pipeline (hash/heic/exif/thumbnail/compress) to a Web Worker. Unset/true = auto; false = main thread. */
    webWorker?: boolean
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
    icons?: UploaderIcons

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
