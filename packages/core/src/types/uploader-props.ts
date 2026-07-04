import type { ImageEditorOptions } from './image-editor'
import type { LocaleBundle, PartialMessages } from '../i18n/types'
import type {
    MaxFileSizeObject,
    ResumableUploadOptions,
} from './upload-protocols'
import type { UploadFile } from './upload-file'
import type { UploadProvider, UploadSource } from './uploader-options'
import type { UpupThemeConfig } from '../theme/types'

/**
 * Shared shape of the UI-package `UploaderProps` across react/vue/svelte/
 * angular. Each framework extends this with its own `icons` (component type
 * differs per framework) and `style` (React.CSSProperties vs
 * Record<string, string>) — the two genuinely framework-specific members.
 *
 * Canonical home for the props all four frameworks hand-authored in
 * parallel; keeping one definition here means a field added to one
 * framework's copy can no longer silently diverge from the others.
 */
export type UploaderBaseProps = {
    /**
     * Storage provider. Optional for local-only selection and generic
     * uploadEndpoint/serverUrl flows. When provided, accepts core provider
     * enum values plus custom provider ids forwarded to user/server code.
     */
    provider?: UploadProvider

    // ── v2 DX aliases (preferred) ────────────────────────────
    /**
     * Upload mode. `'client'` (default) = browser talks to storage
     * directly; server only signs URLs. `'server'` = browser talks only
     * to `serverUrl`, which proxies drive APIs + storage writes. Pick
     * `'server'` when you can't expose OAuth client secrets to the
     * browser or when you need server-side compliance/scanning.
     */
    mode?: 'client' | 'server'
    /** Source list. e.g. sources={['local','camera','googleDrive']} */
    sources?: UploadSource[]
    /** Endpoint returning presigned upload URLs. */
    uploadEndpoint?: string
    /** Server URL for @upup/server handler. */
    serverUrl?: string
    /** Maximum number of files that can be added. Default 10. */
    maxFiles?: number
    /** v2: Theme configuration. mode replaces `dark`, tokens/slots replace flat styling overrides. */
    theme?: UpupThemeConfig

    /** Folder upload configuration. */
    folderUpload?: {
        /** Traverse directories when a user drops a folder onto the uploader. */
        allowDrop?: boolean
        /** Show a "Select folder" action in the local device source. */
        showSelectFolderButton?: boolean
    }
    /** CORS configuration. `dangerouslyAutoConfigure` can mutate storage CORS and should only be used for quick setup. */
    cors?: {
        dangerouslyAutoConfigure?: boolean
        allowedOrigins: string[]
        allowedMethods?: string[]
        allowedHeaders?: string[]
        maxAgeSeconds?: number
    }
    /** Cloud drive configurations. */
    cloudDrives?: {
        googleDrive?: { clientId: string; apiKey: string; appId: string }
        oneDrive?: { clientId: string; redirectUri?: string }
        dropbox?: { clientId: string; redirectUri?: string }
        box?: { clientId: string; redirectUri?: string }
    }
    /** v2: Enable automatic image compression before upload. */
    imageCompression?: boolean
    /** v2: Generate thumbnails for images/videos before upload. */
    thumbnailGenerator?: boolean
    /** v2: Verify file integrity with SHA-256 checksums. */
    checksumVerification?: boolean
    /** v2: Offload the file pipeline (hash/heic/exif/thumbnail/compress) to a Web Worker. Unset/true = auto; false = main thread. */
    webWorker?: boolean
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
    /** File type filter — MIME patterns, extensions, or preset names (e.g. "images", "documents"). */
    allowedFileTypes?: string | string[]
    allowPreview?: boolean
    /** v2: Show/hide the upup branding footer. Default true. */
    showBranding?: boolean
    /** v2: Disable drag-and-drop (keep browse/click functional). Default false. */
    disableDragDrop?: boolean
    /** v2: Additional CSS class name applied to the root container */
    className?: string
    isProcessing?: boolean
    mini?: boolean
    maxFileSize?: MaxFileSizeObject
    /** v2: Minimum file size. Files smaller than this will be rejected. */
    minFileSize?: MaxFileSizeObject
    /** v2: Maximum total size of all files combined. */
    maxTotalFileSize?: MaxFileSizeObject
    /** Optional image editor. Pass `true` for defaults or an `ImageEditorOptions` object. */
    imageEditor?: boolean | ImageEditorOptions
    metadata?: Record<string, unknown>
    maxRetries?: number
    resumable?: ResumableUploadOptions

    // i18n / Localisation
    /** i18n configuration. Uses ICU locale bundles from `@upup/core`. */
    i18n?: {
        /**
         * ICU-enabled locale bundle from `@upup/core/i18n` (e.g. `import { enUS } from '@upup/core'`).
         * When provided, enables ICU pluralization, namespaced key overrides, and runtime locale switching.
         * Takes precedence over `locale`.
         */
        bundle?: LocaleBundle
        /**
         * Locale bundle (e.g. `frFR`) or a BCP-47 locale code string
         * (e.g. 'ar-SA') for lang/dir only.
         */
        locale?: LocaleBundle | string
        /**
         * Optional fallback locale bundle/code used when the active bundle is
         * missing a message key. String codes are for playground/codegen
         * convenience; pass bundles for translated fallback content.
         */
        fallbackLocale?: LocaleBundle | string
        /** Per-key overrides merged on top of the locale */
        overrides?: PartialMessages
    }

    // Event Handlers
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
        {
            loaded,
            total,
            percentage,
        }: { loaded: number; total: number; percentage: number },
    ) => void
    onFilesUploadProgress?: (completedFiles: number, totalFiles: number) => void
    /** v2: Called once when the batch upload starts */
    onUploadStart?: () => void
    /** v2: Called when all uploads complete or fail */
    onUploadComplete?: (files: UploadFile[]) => void
    /** v2: Called whenever upload status changes (idle → uploading → complete/failed) */
    onStatusChange?: (status: string) => void
    /** v2: Called when a file is removed. */
    onFileRemoved?: (file: UploadFile) => void
    onFilesDragOver?: (files: File[]) => void
    onFilesDragLeave?: (files: File[]) => void
    onFilesDrop?: (files: File[]) => void
    onFileTypeMismatch?: (file: File, acceptedTypes: string) => void
    /** v2: Called when a file is rejected for any reason (type, size, limit). */
    onRestrictionFailed?: (
        file: File,
        reason:
            | 'TYPE_MISMATCH'
            | 'FILE_TOO_LARGE'
            | 'FILE_TOO_SMALL'
            | 'LIMIT_EXCEEDED',
    ) => void
    /** v2: Enable clipboard paste uploads (Ctrl+V / Cmd+V). Default false. */
    enablePaste?: boolean
    /** v2: Async filter called before each file is added. Return false to reject, a File to replace, or true/undefined to accept. */
    onBeforeFileAdded?: (
        file: File,
    ) => boolean | File | undefined | Promise<boolean | File | undefined>
    onError?: (errorMessage: string) => void
    onWarn?: (warningMessage: string) => void
    /** v2: After each file upload, open an SSE connection to this endpoint.
     *  The storage key is appended as ?key=... so the server can identify the file.
     *  Use this to wait for server-side processing (virus scan, transcoding, etc.). */
    processingEndpoint?: string
    /** v2: Called when the server sends a processing-complete SSE event for a file. */
    onFileProcessed?: (file: UploadFile, data: Record<string, unknown>) => void
    /** v2: Max milliseconds to wait for the server SSE event before closing. Default 60000. */
    processingTimeout?: number
}
