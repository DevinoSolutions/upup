import { FC } from 'react'
import type { Translations } from './i18n/types'

export type { Translations }

export enum UploadAdapter {
    INTERNAL = 'INTERNAL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    ONE_DRIVE = 'ONE_DRIVE',
    DROPBOX = 'DROPBOX',
    BOX = 'BOX',
    LINK = 'LINK',
    CAMERA = 'CAMERA',
    AUDIO = 'AUDIO',
    SCREEN = 'SCREEN',
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

export type BoxConfigs = {
    box_client_id?: string
    box_redirect_uri?: string
}

/**
 * Storage providers the uploader recognises by name.
 *
 * Every value except `Azure` is **S3-compatible** — the client uses the
 * same presigned-URL flow for all of them. The string is forwarded to
 * your `tokenEndpoint` / `serverUrl` so your server knows which SDK +
 * endpoint to use when signing requests.
 *
 * Azure is a distinct protocol (Block Blob uploads via SAS URLs).
 */
export enum UpupProvider {
    /** Amazon S3 */
    AWS = 'aws',
    /** Microsoft Azure Blob Storage (separate protocol) */
    Azure = 'azure',
    /** Backblaze B2 (S3-compatible) */
    BackBlaze = 'backblaze',
    /** DigitalOcean Spaces (S3-compatible) */
    DigitalOcean = 'digitalocean',
    /** Cloudflare R2 (S3-compatible) */
    CloudflareR2 = 'r2',
    /** Wasabi Hot Cloud Storage (S3-compatible) */
    Wasabi = 'wasabi',
    /** MinIO self-hosted object storage (S3-compatible) */
    MinIO = 'minio',
    /** Google Cloud Storage via its S3-compatible interoperability mode */
    GCS = 'gcs',
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

/** Shorthand source names for v2 DX */
export type UploadSource = 'local' | 'camera' | 'url' | 'google_drive' | 'onedrive' | 'dropbox' | 'microphone' | 'screen'

export type UpupUploaderProps = {
    // Required Props
    /**
     * Storage provider. Accepts the UpupProvider enum or any of the string
     * literals. All S3-compatible providers share the same client code
     * path; the string is forwarded to your server-side presigning code.
     */
    provider:
        | UpupProvider
        | 'aws'
        | 'azure'
        | 'backblaze'
        | 'digitalocean'
        | 'r2'
        | 'wasabi'
        | 'minio'
        | 'gcs'
    tokenEndpoint?: string

    // ── v2 DX aliases (preferred) ────────────────────────────
    /** v2: Shorthand source list. e.g. sources={['local','camera','google_drive']} */
    sources?: UploadSource[]
    /** v2: Alias for tokenEndpoint */
    uploadEndpoint?: string
    /** v2: Server URL for @upup/server handler (replaces tokenEndpoint in server mode) */
    serverUrl?: string
    /** v2: API key for upup managed service — no server setup needed */
    apiKey?: string
    /** v2: Alias for limit */
    maxFiles?: number
    /** v2: Unified file restrictions object */
    restrictions?: {
        maxFileSize?: MaxFileSizeObject
        minFileSize?: MaxFileSizeObject
        maxTotalFileSize?: MaxFileSizeObject
        maxNumberOfFiles?: number
        allowedFileTypes?: string[]
    }
    /** v2: Theme configuration. mode replaces `dark`, tokens/slots replace `classNames`. */
    theme?: {
        mode?: 'light' | 'dark' | 'system'
        tokens?: Record<string, unknown>
        /**
         * Per-slot className overrides — each override is optional and merged
         * additively on top of the built-in classes via flattenSlotsToClassNames.
         */
        slots?: import('@upup/shared').DeepPartialSlots
    }

    // ── v1 Props (still supported) ───────────────────────────
    showSelectFolderButton?: boolean
    enableAutoCorsConfig?: boolean
    /** @deprecated Use `sources` instead */
    uploadAdapters?: UploadAdapter[]
    /** v2: Cloud drive configurations with cleaner keys */
    cloudDrives?: {
        googleDrive?: { clientId: string; apiKey: string; appId: string }
        oneDrive?: { clientId: string; redirectUri?: string }
        dropbox?: { clientId: string; redirectUri?: string }
        box?: { clientId: string; redirectUri?: string }
    }
    /** @deprecated Use `cloudDrives` instead */
    driveConfigs?: {
        googleDrive?: GoogleDriveConfigs
        oneDrive?: OneDriveConfigs
        dropbox?: DropboxConfigs
        box?: BoxConfigs
    }
    /** v2: Enable automatic image compression before upload. */
    imageCompression?: boolean
    /** v2: Generate thumbnails for images/videos before upload. */
    thumbnailGenerator?: boolean
    /** v2: Verify file integrity with SHA-256 checksums. */
    checksumVerification?: boolean
    /** v2: Convert HEIC/HEIF images to JPEG before upload. */
    heicConversion?: boolean
    /** v2: Strip EXIF metadata from images for privacy. */
    stripExifData?: boolean
    /** v2: Enable content-based deduplication (prevents same file added twice). */
    contentDeduplication?: boolean
    /** v2: Upload files immediately after selection (no upload button needed). Default false. */
    autoUpload?: boolean
    /** v2: Maximum concurrent uploads. Default 3. */
    maxConcurrentUploads?: number
    /** v2: Enable crash recovery — saves upload state to IndexedDB for resume after page refresh */
    crashRecovery?: boolean
    accept?: string
    allowPreview?: boolean
    /** v2: Show/hide the upup branding footer. Default true. */
    showBranding?: boolean
    /** v2: Allow selecting entire folders (directory upload). Adds "select a folder" button. */
    allowFolderUpload?: boolean
    /** v2: Disable drag-and-drop (keep browse/click functional). Default false. */
    disableDragDrop?: boolean
    /** v2: Additional CSS class name applied to the root container */
    className?: string
    /** v2: Inline styles applied to the root container */
    style?: React.CSSProperties
    isProcessing?: boolean
    mini?: boolean
    maxFileSize?: MaxFileSizeObject
    /** v2: Minimum file size. Files smaller than this will be rejected. */
    minFileSize?: MaxFileSizeObject
    /** v2: Maximum total size of all files combined. */
    maxTotalFileSize?: MaxFileSizeObject
    /** Optional image editor. Pass `true` for defaults or an `ImageEditorOptions` object. */
    imageEditor?: boolean | ImageEditorOptions
    customProps?: object
    maxRetries?: number
    resumable?: ResumableUploadOptions
    icons?: UpupUploaderPropsIcons

    // i18n / Localisation
    /** v2: i18n configuration. Accepts a locale pack or per-key overrides. */
    i18n?: {
        /**
         * ICU-enabled locale bundle from `@upup/shared/i18n` (e.g. `import { enUS } from '@upup/shared'`).
         * When provided, enables ICU pluralization, namespaced key overrides, and runtime locale switching.
         * Takes precedence over `locale`.
         */
        bundle?: import('@upup/shared').LocaleBundle
        /**
         * Full locale pack (e.g. import { fr_FR } from 'upup-react-file-uploader/locales'),
         * or a BCP-47 locale code string (e.g. 'ar-SA') for lang/dir only.
         */
        locale?: Translations | string
        /** Per-key overrides merged on top of the locale */
        overrides?: Partial<Translations>
    }
    /** @deprecated Use `i18n.locale` instead */
    localePack?: Translations
    /** @deprecated Use `i18n.overrides` instead */
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
    /** v2: Called once when the batch upload starts */
    onUploadStart?: () => void
    /** v2: Called when all uploads complete or fail */
    onUploadComplete?: (files: FileWithParams[]) => void
    /** v2: Called whenever upload status changes (idle → uploading → complete/failed) */
    onStatusChange?: (status: string) => void
    /** v2: Alias for onFileRemove with v2 naming */
    onFileRemoved?: (file: FileWithParams) => void
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    /** v2: Called when a file is rejected for any reason (type, size, limit). */
    onRestrictionFailed?: (file: File, reason: 'TYPE_MISMATCH' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'LIMIT_EXCEEDED') => void
    /** v2: Enable clipboard paste uploads (Ctrl+V / Cmd+V). Default false. */
    enablePaste?: boolean
    /** v2: Async filter called before each file is added. Return false to reject, a File to replace, or true/undefined to accept. */
    onBeforeFileAdded?: (file: File) => boolean | File | undefined | Promise<boolean | File | undefined>
    onError?: (errorMessage: string) => void
    onWarn?: (warningMessage: string) => void
    /** v2: After each file upload, open an SSE connection to this endpoint.
     *  The storage key is appended as ?key=... so the server can identify the file.
     *  Use this to wait for server-side processing (virus scan, transcoding, etc.). */
    processingEndpoint?: string
    /** v2: Called when the server sends a processing-complete SSE event for a file. */
    onFileProcessed?: (file: FileWithParams, data: Record<string, unknown>) => void
    /** v2: Max milliseconds to wait for the server SSE event before closing. Default 60000. */
    processingTimeout?: number
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
