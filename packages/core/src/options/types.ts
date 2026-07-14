import type { FileManagerOptions } from '../file-manager'
import type { PipelineStep } from '../contracts-pipeline'
import type { ResumableUploadOptions } from '../types/upload-protocols'
import type { UpupPlugin } from '../plugin'
import type { LocaleBundle, UpupLocaleCode } from '../i18n/types'
import type { PersistentStorage } from '../crash-recovery'
import type { CloudDrivesConfig } from '../drives/configs'

export type {
    CloudDrivesConfig,
    GoogleDriveConfig,
    OneDriveConfig,
    DropboxConfig,
    BoxConfig,
} from '../drives/configs'

export interface UpupCorsConfig {
    dangerouslyAutoConfigure?: boolean
    allowedOrigins: string[]
    allowedMethods?: string[]
    allowedHeaders?: string[]
    maxAgeSeconds?: number
}

export interface CrashRecoveryOptions {
    storage?: PersistentStorage
}

// Options-bag input type: every field is optional and each framework bridge
// constructs it by spreading its own optional props (all `T | undefined`).
// Under `exactOptionalPropertyTypes`, `{ x: undefined }` is not assignable to
// `x?: T`, so each field is widened to `?: T | undefined` — "omit or pass
// undefined, same thing". Widening is backward-compatible (readers of an
// optional already saw `T | undefined`) and pin-safe (pins check export names).
export interface CoreOptions extends FileManagerOptions {
    uploadEndpoint?: string | undefined
    serverUrl?: string | undefined
    provider?: string | undefined
    mode?: 'client' | 'server' | undefined
    plugins?: UpupPlugin[] | undefined
    pipeline?: PipelineStep[] | undefined
    resumable?: ResumableUploadOptions | undefined
    heicConversion?: boolean | undefined
    stripExifData?: boolean | undefined
    imageCompression?: boolean | object | undefined
    thumbnailGenerator?: boolean | object | undefined
    checksumVerification?: boolean | undefined
    /**
     * Web Worker offload for the file pipeline (hash/heic/exif/thumbnail/compress).
     * Unset/`true` = auto (workers used when supported, transparent main-thread
     * fallback otherwise). `false` = force the main thread.
     */
    webWorker?: boolean | undefined
    /**
     * Web-worker task timeout in ms. Default 30000. On timeout the task falls
     * back to main-thread processing (it never fails the file).
     */
    workerTimeoutMs?: number | undefined
    maxRetries?: number | undefined
    maxConcurrentUploads?: number | undefined
    autoUpload?: boolean | undefined
    fastAbortThreshold?: number | undefined
    isSuccessfulCall?:
        | ((response: {
              status: number
              headers: Record<string, string>
              body: unknown
          }) => boolean | Promise<boolean>)
        | undefined
    crashRecovery?: boolean | CrashRecoveryOptions | undefined
    onError?: ((error: string | Error) => void) | undefined
    metadata?: Record<string, unknown> | undefined
    cors?: UpupCorsConfig | undefined
    /**
     * i18n configuration. Accepts either:
     * - a full LocaleBundle (`import { enUS } from './contracts'`) — also
     *   drives the file-pipeline translator (`context.t` inside pipeline
     *   steps), not just the UI translator.
     * - a BCP 47 locale code string (e.g. `'fr-FR'`) — resolves to lang/dir
     *   only until a locale registry exists; consumers are responsible for
     *   resolving codes to bundles via `i18n.loadLocale`.
     */
    locale?: LocaleBundle | UpupLocaleCode | undefined
    cloudDrives?: CloudDrivesConfig | undefined
}

export type ValidationResult = {
    file: File
    valid: boolean
    errors: Array<{ code: string; message: string }>
}

export type UploadOptions = {
    checksumVerification?: boolean
    imageCompression?: boolean | object
    heicConversion?: boolean
    stripExifData?: boolean
    maxRetries?: number
    metadata?: Record<string, string>
}
