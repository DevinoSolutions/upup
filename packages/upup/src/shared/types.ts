import { FC } from 'react'
import type { Translations } from './i18n/types'

export type { Translations }

export enum UploadAdapter {
    INTERNAL = 'INTERNAL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    ONE_DRIVE = 'ONE_DRIVE',
    DROPBOX = 'DROPBOX',
    LINK = 'LINK',
    CAMERA = 'CAMERA',
    // UNSPLASH = 'UNSPLASH',
    // BOX = 'BOX',
}

export type GoogleDriveConfigs = {
    google_api_key: string
    google_app_id: string
    google_client_id: string
}

export type OneDriveConfigs = {
    onedrive_client_id: string
    redirectUri?: string
}

export type DropboxConfigs = {
    dropbox_client_id?: string
    dropbox_redirect_uri?: string
}

export enum UpupProvider {
    AWS = 'aws',
    Azure = 'azure',
    BackBlaze = 'backblaze',
    DigitalOcean = 'digitalocean',
}

type MaxFileSizeObject = {
    size: number
    unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
}

/**
 * Configuration for the optional image editor.
 * The editor is lazy-loaded at runtime; consumers must install
 * `react-filerobot-image-editor` and its peer deps separately.
 */
export type ImageEditorOptions = {
    /** Whether the editor is enabled (default false). */
    enabled?: boolean
    /**
     * How the editor is displayed.
     * - "inline":  overlays the editor on top of the uploader container (default)
     * - "modal":   opens the editor in a full-screen modal dialog
     */
    display?: 'inline' | 'modal'
    /**
     * When to auto-open the editor after file selection.
     * - "never":  never auto-open (user clicks Edit manually)
     * - "single": auto-open when exactly 1 new image is added
     * - "always": auto-open for every newly added image (queued sequentially)
     */
    autoOpen?: 'never' | 'single' | 'always'
    /** Output settings for the edited image. */
    output?: {
        /** MIME type for the saved image (e.g. "image/png", "image/webp"). */
        mimeType?: string
        /** Quality 0–1 for lossy formats (jpeg/webp). */
        quality?: number
        /** Custom file name generator. Receives the original File. */
        fileName?: (original: File) => string
    }
    /**
     * Filerobot tab keys to show.
     * @see https://github.com/nicedayfor/filerobot-image-editor#tabs
     */
    tabs?: (
        | 'Adjust'
        | 'Annotate'
        | 'Filters'
        | 'Finetune'
        | 'Resize'
        | 'Watermark'
    )[]
    /**
     * Filerobot tool keys to show inside the Annotate tab.
     * @see https://github.com/nicedayfor/filerobot-image-editor#tools
     */
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
    /** Callback fired when the editor modal opens. */
    onOpen?: (file: FileWithParams) => void
    /** Callback fired when the user cancels editing. */
    onCancel?: (file: FileWithParams) => void
    /** Callback fired after the user saves an edit. */
    onSave?: (editedFile: FileWithParams, originalFile: FileWithParams) => void
}

/** Resolved image editor config with all defaults applied. */
export type ResolvedImageEditorOptions = Required<
    Pick<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>
> &
    Omit<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>

export type UpupUploaderPropsClassNames = {
    fileIcon?: string
    containerMini?: string
    containerFull?: string
    containerHeader?: string
    containerCancelButton?: string
    containerAddMoreButton?: string

    adapterButtonList?: string
    adapterButton?: string
    adapterButtonIcon?: string
    adapterButtonText?: string

    adapterViewHeader?: string
    adapterViewCancelButton?: string
    adapterView?: string
    driveLoading?: string

    driveHeader?: string
    driveLogoutButton?: string
    driveSearchContainer?: string
    driveSearchInput?: string
    driveBody?: string
    driveItemContainerDefault?: string
    driveItemContainerSelected?: string
    driveItemContainerInner?: string
    driveItemInnerText?: string
    driveFooter?: string
    driveAddFilesButton?: string
    driveCancelFilesButton?: string

    urlInput?: string
    urlFetchButton?: string

    cameraPreviewContainer?: string
    cameraDeleteButton?: string
    cameraCaptureButton?: string
    cameraRotateButton?: string
    cameraAddButton?: string

    fileListContainer?: string
    fileListContainerInnerSingle?: string
    fileListContainerInnerMultiple?: string
    fileListFooter?: string

    filePreviewPortal?: string
    fileItemSingle?: string
    fileItemMultiple?: string
    fileThumbnailSingle?: string
    fileThumbnailMultiple?: string
    fileInfo?: string
    fileName?: string
    fileSize?: string
    filePreviewButton?: string
    fileDeleteButton?: string

    uploadButton?: string
    uploadDoneButton?: string

    progressBarContainer?: string
    progressBar?: string
    progressBarInner?: string
    progressBarText?: string
}

export type UpupUploaderPropsIcons = {
    ContainerAddMoreIcon?: FC<{ className?: string }>

    FileDeleteIcon?: FC<{ className?: string }>

    CameraDeleteIcon?: FC<{ className?: string }>
    CameraCaptureIcon?: FC<{ className?: string }>
    CameraRotateIcon?: FC<{ className?: string }>

    LoaderIcon?: FC<{ className?: string }>
}

export type UpupUploaderProps = {
    // Required Props
    provider: UpupProvider
    tokenEndpoint: string

    // Optional Props
    showSelectFolderButton?: boolean // Controls the "select a folder" button visibility
    enableAutoCorsConfig?: boolean
    uploadAdapters?: UploadAdapter[]
    driveConfigs?: {
        googleDrive?: GoogleDriveConfigs
        oneDrive?: OneDriveConfigs
        dropbox?: DropboxConfigs
    }
    shouldCompress?: boolean
    accept?: string
    limit?: number
    allowPreview?: boolean
    isProcessing?: boolean
    mini?: boolean
    maxFileSize?: MaxFileSizeObject
    /** Optional image editor. Pass `true` for defaults or an `ImageEditorOptions` object. */
    imageEditor?: boolean | ImageEditorOptions
    customProps?: object
    dark?: boolean
    maxRetries?: number
    resumable?: ResumableUploadOptions
    classNames?: UpupUploaderPropsClassNames
    icons?: UpupUploaderPropsIcons

    // i18n / Localisation
    /** A full locale pack (a `Translations` object, e.g. `ja_JP`). Defaults to `en_US`. */
    localePack?: Translations
    /** Per-key overrides that are deep-merged on top of the active locale. */
    translations?: Partial<Translations>

    // Event Handlers
    onFilesSelected?: (files: FileWithParams[]) => void
    onDoneClicked?: () => void
    onPrepareFiles?: (files: FileWithParams[]) => Promise<FileWithParams[]>
    onFileClick?: (file: FileWithParams) => void
    onIntegrationClick?: (integrationType: string) => void
    onFileUploadStart?: (file: FileWithParams) => void
    onFileUploadComplete?: (file: FileWithParams, key: string) => void
    onFilesUploadComplete?: (fileWithParams: FileWithParams[]) => void
    onFileUploadProgress?: (
        file: FileWithParams,
        {
            loaded,
            total,
            percentage,
        }: { loaded: number; total: number; percentage: number },
    ) => void
    onFilesUploadProgress?: (completedFiles: number, totalFiles: number) => void
    onFileRemove?: (file: FileWithParams) => void
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    // onCancelUpload?: (files: FileWithParams[]) => void
    onError?: (errorMessage: string) => void
    onWarn?: (warningMessage: string) => void
}

export type PresignedUrlResponse = {
    key: string
    publicUrl: string
    uploadUrl: string
    expiresIn: number
}

export enum UploadErrorType {
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    EXPIRED_URL = 'EXPIRED_URL',

    FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
    PRESIGNED_URL_ERROR = 'PRESIGNED_URL_ERROR',

    SIGNED_URL_ERROR = 'SIGNED_URL_ERROR',
    CORS_CONFIG_ERROR = 'CORS_CONFIG_ERROR',
    TEMPORARY_CREDENTIALS_ERROR = 'TEMPORARY_CREDENTIALS_ERROR',

    UNKNOWN_UPLOAD_ERROR = 'UNKNOWN_UPLOAD_ERROR',
}

export class UploadError extends Error {
    private readonly DEFAULT_ERROR_STATUS_CODE = 500

    constructor(
        message: string,
        public type = UploadErrorType.UNKNOWN_UPLOAD_ERROR,
        public retryable = false,
        public status?: number,
    ) {
        super(message)
        this.name = 'UploadError'
        this.status = status ?? this.DEFAULT_ERROR_STATUS_CODE
    }
}

export type FileWithParams = File & {
    id: string
    url: string
    key?: string
    fileHash?: string | undefined
    thumbnail?: {
        file: File
        key?: string
    }
}

export type FileWithProgress = FileWithParams & { progress: number }

/**
 * Options for resumable uploads.
 * Currently supports 'multipart' mode for S3-compatible providers.
 * 'tus' mode is reserved for future implementation.
 */
export type ResumableUploadOptions =
    | {
          mode: 'multipart'
          /** Part size in bytes. Minimum 5 MiB, clamped automatically. */
          chunkSizeBytes?: number
          /** Persist upload sessions in localStorage for cross-refresh resume. Default: true */
          persist?: boolean
      }
    | {
          mode: 'tus'
          /** Tus server endpoint (not implemented yet) */
          endpoint: string
      }

/**
 * Response from tokenEndpoint for multipart:init action
 */
export type MultipartInitResponse = {
    key: string
    uploadId: string
    partSize: number
    expiresIn: number
}

/**
 * Response from tokenEndpoint for multipart:signPart action
 */
export type MultipartSignPartResponse = {
    uploadUrl: string
    expiresIn: number
}

/**
 * A single uploaded part reference
 */
export type MultipartPart = {
    partNumber: number
    eTag: string
}

/**
 * Response from tokenEndpoint for multipart:listParts action
 */
export type MultipartListPartsResponse = {
    parts: MultipartPart[]
}

/**
 * Response from tokenEndpoint for multipart:complete action
 */
export type MultipartCompleteResponse = {
    key: string
    publicUrl: string
}

/**
 * Response from tokenEndpoint for multipart:abort action
 */
export type MultipartAbortResponse = {
    ok: true
}
