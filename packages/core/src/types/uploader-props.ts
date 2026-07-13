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
// Options-bag input type: every field is optional. Each framework bridge
// constructs it by destructuring its own optional props (all `T | undefined`);
// Vue's `withDefaults(defineProps<T>())` additionally transforms every `?: T`
// into `T | undefined` (LooseRequired). Under `exactOptionalPropertyTypes`,
// `{ x: undefined }` is not assignable to `x?: T`, so each field is widened
// to `?: T | undefined`. Widening is backward-compatible (readers of an
// optional already saw `T | undefined`) and pin-safe.
export type UploaderBaseProps = {
    /**
     * Storage provider. Optional for local-only selection and generic
     * uploadEndpoint/serverUrl flows. When provided, accepts core provider
     * enum values plus custom provider ids forwarded to user/server code.
     */
    provider?: UploadProvider | undefined

    // ── v2 DX aliases (preferred) ────────────────────────────
    /**
     * Upload mode. `'client'` (default) = browser talks to storage
     * directly; server only signs URLs. `'server'` = browser talks only
     * to `serverUrl`, which proxies drive APIs + storage writes. Pick
     * `'server'` when you can't expose OAuth client secrets to the
     * browser or when you need server-side compliance/scanning.
     */
    mode?: 'client' | 'server' | undefined
    /** Source list. e.g. sources={['local','camera','googleDrive']} */
    sources?: UploadSource[] | undefined
    /** Endpoint returning presigned upload URLs. */
    uploadEndpoint?: string | undefined
    /** Server URL for @upupjs/server handler. */
    serverUrl?: string | undefined
    /** Maximum number of files that can be added. Default 10. */
    maxFiles?: number | undefined
    /** v2: Theme configuration. mode replaces `dark`, tokens/slots replace flat styling overrides. */
    theme?: UpupThemeConfig | undefined

    /** Folder upload configuration. */
    folderUpload?:
        | {
              /** Traverse directories when a user drops a folder onto the uploader. */
              allowDrop?: boolean
              /** Show a "Select folder" action in the local device source. */
              showSelectFolderButton?: boolean
          }
        | undefined
    /** CORS configuration. `dangerouslyAutoConfigure` can mutate storage CORS and should only be used for quick setup. */
    cors?:
        | {
              dangerouslyAutoConfigure?: boolean
              allowedOrigins: string[]
              allowedMethods?: string[]
              allowedHeaders?: string[]
              maxAgeSeconds?: number
          }
        | undefined
    /** Cloud drive configurations. */
    cloudDrives?:
        | {
              googleDrive?: { clientId: string; apiKey: string; appId: string }
              oneDrive?: { clientId: string; redirectUri?: string }
              dropbox?: { clientId: string; redirectUri?: string }
              box?: { clientId: string; redirectUri?: string }
          }
        | undefined
    /** v2: Enable automatic image compression before upload. */
    imageCompression?: boolean | undefined
    /** v2: Generate thumbnails for images/videos before upload. */
    thumbnailGenerator?: boolean | undefined
    /** v2: Verify file integrity with SHA-256 checksums. */
    checksumVerification?: boolean | undefined
    /** v2: Offload the file pipeline (hash/heic/exif/thumbnail/compress) to a Web Worker. Unset/true = auto; false = main thread. */
    webWorker?: boolean | undefined
    /** v2: Convert HEIC/HEIF images to JPEG before upload. */
    heicConversion?: boolean | undefined
    /** v2: Strip EXIF metadata from images for privacy. */
    stripExifData?: boolean | undefined
    /** v2: Enable content-based deduplication (prevents same file added twice). */
    contentDeduplication?: boolean | undefined
    /** v2: Upload files immediately after selection (no upload button needed). Default false. */
    autoUpload?: boolean | undefined
    /** v2: Maximum concurrent uploads. Default 3. */
    maxConcurrentUploads?: number | undefined
    /** v2: Enable crash recovery — saves upload state to IndexedDB for resume after page refresh */
    crashRecovery?: boolean | undefined
    /** File type filter — MIME patterns, extensions, or preset names (e.g. "images", "documents"). */
    allowedFileTypes?: string | string[] | undefined
    allowPreview?: boolean | undefined
    /** v2: Show/hide the upup branding footer. Default true. */
    showBranding?: boolean | undefined
    /** v2: Disable drag-and-drop (keep browse/click functional). Default false. */
    disableDragDrop?: boolean | undefined
    /** v2: Additional CSS class name applied to the root container */
    className?: string | undefined
    isProcessing?: boolean | undefined
    mini?: boolean | undefined
    maxFileSize?: MaxFileSizeObject | undefined
    /** v2: Minimum file size. Files smaller than this will be rejected. */
    minFileSize?: MaxFileSizeObject | undefined
    /** v2: Maximum total size of all files combined. */
    maxTotalFileSize?: MaxFileSizeObject | undefined
    /** Optional image editor. Pass `true` for defaults or an `ImageEditorOptions` object. */
    imageEditor?: boolean | ImageEditorOptions | undefined
    metadata?: Record<string, unknown> | undefined
    maxRetries?: number | undefined
    resumable?: ResumableUploadOptions | undefined

    // i18n / Localisation
    /** i18n configuration. Uses ICU locale bundles from `@upupjs/core`. */
    i18n?:
        | {
              /**
               * ICU-enabled locale bundle from `@upupjs/core/i18n` (e.g. `import { enUS } from '@upupjs/core'`).
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
        | undefined

    // Event Handlers
    onFilesSelected?: ((files: UploadFile[]) => void) | undefined
    onDoneClicked?: (() => void) | undefined
    onPrepareFiles?:
        ((files: UploadFile[]) => Promise<UploadFile[]>) | undefined
    onFileClick?: ((file: UploadFile) => void) | undefined
    onIntegrationClick?: ((integrationType: string) => void) | undefined
    onFileUploadStart?: ((file: UploadFile) => void) | undefined
    onFileUploadComplete?: ((file: UploadFile, key: string) => void) | undefined
    onFilesUploadComplete?: ((files: UploadFile[]) => void) | undefined
    onFileUploadProgress?:
        | ((
              file: UploadFile,
              progress: { loaded: number; total: number; percentage: number },
          ) => void)
        | undefined
    onFilesUploadProgress?:
        ((completedFiles: number, totalFiles: number) => void) | undefined
    /** v2: Called once when the batch upload starts */
    onUploadStart?: (() => void) | undefined
    /** v2: Called when all uploads complete or fail */
    onUploadComplete?: ((files: UploadFile[]) => void) | undefined
    /** v2: Called whenever upload status changes (idle → uploading → complete/failed) */
    onStatusChange?: ((status: string) => void) | undefined
    /** v2: Called when a file is removed. */
    onFileRemoved?: ((file: UploadFile) => void) | undefined
    onFilesDragOver?: ((files: File[]) => void) | undefined
    onFilesDragLeave?: ((files: File[]) => void) | undefined
    onFilesDrop?: ((files: File[]) => void) | undefined
    onFileTypeMismatch?:
        ((file: File, acceptedTypes: string) => void) | undefined
    /** v2: Called when a file is rejected for any reason (type, size, limit). */
    onRestrictionFailed?:
        | ((
              file: File,
              reason:
                  | 'TYPE_MISMATCH'
                  | 'FILE_TOO_LARGE'
                  | 'FILE_TOO_SMALL'
                  | 'LIMIT_EXCEEDED',
          ) => void)
        | undefined
    /** v2: Enable clipboard paste uploads (Ctrl+V / Cmd+V). Default false. */
    enablePaste?: boolean | undefined
    /** v2: Async filter called before each file is added. Return false to reject, a File to replace, or true/undefined to accept. */
    onBeforeFileAdded?:
        | ((
              file: File,
          ) => boolean | File | undefined | Promise<boolean | File | undefined>)
        | undefined
    onError?: ((errorMessage: string) => void) | undefined
    onWarn?: ((warningMessage: string) => void) | undefined
    /** v2: After each file upload, open an SSE connection to this endpoint.
     *  The storage key is appended as ?key=... so the server can identify the file.
     *  Use this to wait for server-side processing (virus scan, transcoding, etc.). */
    processingEndpoint?: string | undefined
    /** v2: Called when the server sends a processing-complete SSE event for a file. */
    onFileProcessed?:
        ((file: UploadFile, data: Record<string, unknown>) => void) | undefined
    /** v2: Max milliseconds to wait for the server SSE event before closing. Default 60000. */
    processingTimeout?: number | undefined
}
