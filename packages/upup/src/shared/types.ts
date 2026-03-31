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
    AUDIO = 'AUDIO',
    SCREEN_CAPTURE = 'SCREEN_CAPTURE',
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

/**
 * Options for automatic thumbnail generation.
 * Applies to image and video files — other file types are skipped.
 */
export type ThumbnailGeneratorOptions = {
    /** Maximum thumbnail width in pixels. Default `200`. */
    thumbnailWidth?: number
    /** Maximum thumbnail height in pixels. Default `200`. */
    thumbnailHeight?: number
    /** Output MIME type for the thumbnail (e.g. `'image/png'`). Default `'image/jpeg'`. */
    thumbnailType?: string
    /** If `true`, wait for all thumbnails to be generated before starting the upload. Default `false`. */
    waitForThumbnailsBeforeUpload?: boolean
}

/**
 * Options for canvas-based image compression (quality/dimension reduction).
 * Only applies to image files — non-images are passed through unchanged.
 */
export type ImageCompressionOptions = {
    /** JPEG/WebP quality, 0–1. Default `0.8`. */
    quality?: number
    /** Maximum width in pixels. The image is scaled proportionally. Default `1920`. */
    maxWidth?: number
    /** Maximum height in pixels. The image is scaled proportionally. Default `1920`. */
    maxHeight?: number
    /** Output MIME type (e.g. `'image/webp'`). Defaults to the original file's MIME. */
    mimeType?: string
    /**
     * File-size threshold in bytes.
     * Images larger than this are converted to JPEG before compressing.
     * Default `Infinity` (never convert).
     */
    convertSize?: number
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
    cameraMirrorButton?: string
    cameraAddButton?: string
    cameraModeToggle?: string
    cameraVideoRecordButton?: string
    cameraVideoStopButton?: string
    cameraVideoPreview?: string
    cameraVideoAddButton?: string
    cameraVideoDeleteButton?: string

    audioRecordButton?: string
    audioStopButton?: string
    audioPlaybackContainer?: string
    audioWaveform?: string
    audioAddButton?: string
    audioDeleteButton?: string

    screenCaptureContainer?: string
    screenCaptureStartButton?: string
    screenCaptureStopButton?: string
    screenCapturePreview?: string
    screenCaptureAddButton?: string
    screenCaptureDeleteButton?: string

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
    CameraMirrorIcon?: FC<{ className?: string }>
    CameraVideoRecordIcon?: FC<{ className?: string }>
    CameraVideoStopIcon?: FC<{ className?: string }>
    CameraVideoDeleteIcon?: FC<{ className?: string }>

    AudioRecordIcon?: FC<{ className?: string }>
    AudioStopIcon?: FC<{ className?: string }>
    AudioDeleteIcon?: FC<{ className?: string }>

    ScreenCaptureStartIcon?: FC<{ className?: string }>
    ScreenCaptureStopIcon?: FC<{ className?: string }>
    ScreenCaptureDeleteIcon?: FC<{ className?: string }>

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
    /** Optional canvas-based image compression. Pass `true` for defaults or an `ImageCompressionOptions` object. */
    imageCompression?: boolean | ImageCompressionOptions
    /** Optional thumbnail generation for image and video files. Pass `true` for defaults or a `ThumbnailGeneratorOptions` object. */
    thumbnailGenerator?: boolean | ThumbnailGeneratorOptions
    accept?: string
    limit?: number
    /** Minimum number of files required before upload can proceed. */
    minFiles?: number
    allowPreview?: boolean
    isProcessing?: boolean
    mini?: boolean
    maxFileSize?: MaxFileSizeObject
    minFileSize?: MaxFileSizeObject
    /** Maximum total size of all selected files combined. */
    maxTotalFileSize?: MaxFileSizeObject
    /** Optional image editor. Pass `true` for defaults or an `ImageEditorOptions` object. */
    imageEditor?: boolean | ImageEditorOptions
    customProps?: object
    dark?: boolean | 'auto'
    /** When true, the entire uploader is non-interactive (greyed-out overlay). */
    disabled?: boolean
    /**
     * Controls animation behavior for users who prefer reduced motion.
     * - `'user'` (default): respects the OS `prefers-reduced-motion` setting.
     * - `'always'`: disables all animations regardless of OS setting.
     * - `'never'`: keeps all animations regardless of OS setting.
     */
    reducedMotion?: 'user' | 'always' | 'never'
    /**
     * When true, files are compared by content hash (SHA-256) in addition to
     * filename, so two files with different names but identical bytes are
     * detected as duplicates.
     */
    contentDeduplication?: boolean
    /**
     * When true, EXIF metadata is stripped from image files before upload.
     * Uses canvas re-drawing at original dimensions and full quality so
     * only metadata is removed.
     */
    stripExifData?: boolean
    /**
     * When true, HEIC/HEIF images are automatically converted to JPEG
     * before upload. Uses heic2any (dynamically imported) so the library
     * is only loaded when a HEIC file is encountered.
     */
    heicConversion?: boolean
    /**
     * When true, a full SHA-256 checksum is computed for each file before
     * upload and attached as `checksumSHA256` on the `FileWithParams` object.
     * The server-returned ETag (when available) is attached as `etag`.
     */
    checksumVerification?: boolean
    maxRetries?: number
    /** Maximum number of files to upload simultaneously. Defaults to unlimited (all at once). */
    maxConcurrentUploads?: number
    /** When true, upload starts automatically as soon as files are selected. */
    autoUpload?: boolean
    resumable?: ResumableUploadOptions
    /** Enable crash recovery to restore selected files after a page refresh or crash.
     *  Pass `true` for defaults or a `CrashRecoveryOptions` object. */
    crashRecovery?: boolean | CrashRecoveryOptions
    /** A short informational note displayed in the drop area (e.g. "Images only, up to 5 MB"). */
    note?: string
    /** When false, the file remove button is hidden once upload completes. Default `true`. */
    showRemoveButtonAfterComplete?: boolean
    /** When true, the upload button is hidden (useful with `autoUpload`). */
    hideUploadButton?: boolean
    /** When true, the cancel / remove-all-files button in the header is hidden. */
    hideCancelButton?: boolean
    /** When true, the pause/resume button is hidden during resumable uploads. */
    hidePauseResumeButton?: boolean
    /** When true, the progress bar is hidden after upload completes successfully. */
    hideProgressAfterFinish?: boolean
    /** When true, the retry button is hidden when uploads fail. */
    hideRetryButton?: boolean
    /** When true, the informer notification bar is completely disabled. Use this if you want a custom notification system. */
    disableInformer?: boolean
    /** When false, the file list is hidden and only the drop-zone / adapter panel is shown. Default `true`. */
    showSelectedFiles?: boolean
    /** When false, users cannot add more files once the first upload has started. Default `true`. */
    allowMultipleUploadBatches?: boolean
    /** When true, the local file browse & drop is disabled; only cloud/URL/camera sources remain. */
    disableLocalFiles?: boolean
    /** Duration in ms before informer messages auto-dismiss. Default `6000`. */
    infoTimeout?: number
    /** Default metadata to attach to every uploaded file. */
    meta?: Record<string, unknown>
    /** Width of the uploader container (any CSS value). */
    width?: string | number
    /** Height of the uploader container (any CSS value). */
    height?: string | number
    /** When set to a provider name, that adapter panel opens automatically on mount. */
    autoOpen?: UploadAdapter
    classNames?: UpupUploaderPropsClassNames
    icons?: UpupUploaderPropsIcons

    // i18n / Localisation
    /** A full locale pack (a `Translations` object, e.g. `ja_JP`). Defaults to `en_US`. */
    localePack?: Translations
    /** Per-key overrides that are deep-merged on top of the active locale. */
    translations?: Partial<Translations>

    // Event Handlers
    /**
     * Called before each file is added to the selection.
     * Return `false` to reject the file, a `File` to substitute it, or `true`/`undefined` to accept as-is.
     */
    onBeforeFileAdded?: (file: File) => boolean | File | undefined
    onFilesSelected?: (files: FileWithParams[]) => void
    /**
     * Called before the upload batch starts.
     * Return `false` to prevent the upload, or `true`/`undefined` to proceed.
     */
    onBeforeUpload?: (files: Map<string, FileWithParams>) => boolean | undefined
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
    /**
     * Called when a file is rejected due to a restriction (type, size, limit, etc.).
     * Provides structured information about why the file was rejected.
     */
    onRestrictionFailed?: (
        file: File,
        error: {
            reason: RestrictionFailedReason
            message: string
        },
    ) => void
    /**
     * Called when an upload retry attempt starts.
     * Provides the file being retried, the attempt number and the max retries.
     */
    onRetry?: (
        file: FileWithParams,
        attempt: number,
        maxRetries: number,
    ) => void
}

export type RestrictionFailedReason =
    | 'TYPE_MISMATCH'
    | 'FILE_TOO_LARGE'
    | 'FILE_TOO_SMALL'
    | 'LIMIT_EXCEEDED'
    | 'TOTAL_SIZE_EXCEEDED'
    | 'DUPLICATE'
    | 'BEFORE_FILE_ADDED_REJECTED'

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
    relativePath?: string
    key?: string
    fileHash?: string | undefined
    checksumSHA256?: string
    etag?: string
    thumbnail?: {
        file: File
        key?: string
    }
}

export type FileWithProgress = FileWithParams & { progress: number }

/**
 * Options for crash recovery (Golden Retriever).
 * When enabled, file metadata and blobs are persisted to IndexedDB so that
 * the selection can be restored after a page refresh or browser crash.
 */
export type CrashRecoveryOptions = {
    /** Whether crash recovery is enabled. Default: true when the option object is provided. */
    enabled?: boolean
    /** Name of the IndexedDB database. Default: 'upup_crash_recovery'. */
    storeName?: string
    /** How long (in ms) persisted files remain valid. Default: 86400000 (24 hours). */
    expiry?: number
}

/**
 * Options for resumable uploads.
 * Supports 'multipart' mode for S3-compatible providers and 'tus' mode
 * for tus-protocol servers (https://tus.io).
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
          /** Tus server endpoint URL. Required. */
          endpoint: string
          /** Upload chunk size in bytes. Default: Infinity (no chunking). */
          chunkSize?: number
          /** Retry delays in ms after upload failure. Default: [0, 1000, 3000, 5000]. */
          retryDelays?: number[]
          /** Whether to store the upload URL for resuming. Default: true. */
          storeFingerprintForResuming?: boolean
          /** Whether to remove the stored fingerprint on success. Default: true. */
          removeFingerprintOnSuccess?: boolean
          /** Additional headers to send with every tus request. */
          headers?: Record<string, string>
          /** Additional metadata to include with the tus upload. */
          metadata?: Record<string, string>
          /** Enable parallel chunk uploads. Default: 1 (sequential). */
          parallelUploads?: number
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
    etag?: string
}

/**
 * Response from tokenEndpoint for multipart:abort action
 */
export type MultipartAbortResponse = {
    ok: true
}
