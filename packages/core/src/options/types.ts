import type { FileManagerOptions } from '../file-manager'
import type { PipelineStep } from '../contracts-pipeline'
import type { ResumableUploadOptions } from '../types/upload-protocols'
import type { UpupPlugin } from '../plugin'
import type { LocaleBundle, UpupLocaleCode } from '../i18n/types'
import type { PersistentStorage } from '../crash-recovery'
import type { CloudDrivesConfig } from '../drives/configs'

export type { CloudDrivesConfig, GoogleDriveConfig, OneDriveConfig, DropboxConfig, BoxConfig } from '../drives/configs'

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

export interface CoreOptions extends FileManagerOptions {
  uploadEndpoint?: string
  serverUrl?: string
  provider?: string
  mode?: 'client' | 'server'
  plugins?: UpupPlugin[]
  pipeline?: PipelineStep[]
  resumable?: ResumableUploadOptions
  heicConversion?: boolean
  stripExifData?: boolean
  imageCompression?: boolean | object
  thumbnailGenerator?: boolean | object
  checksumVerification?: boolean
  /**
   * Web Worker offload for the file pipeline (hash/heic/exif/thumbnail/compress).
   * Unset/`true` = auto (workers used when supported, transparent main-thread
   * fallback otherwise). `false` = force the main thread.
   */
  webWorker?: boolean
  maxRetries?: number
  maxConcurrentUploads?: number
  autoUpload?: boolean
  fastAbortThreshold?: number
  isSuccessfulCall?: (response: { status: number; headers: Record<string, string>; body: unknown }) => boolean | Promise<boolean>
  crashRecovery?: boolean | CrashRecoveryOptions
  onError?: (error: string | Error) => void
  metadata?: Record<string, unknown>
  cors?: UpupCorsConfig
  /**
   * i18n configuration. Accepts either:
   * - a full LocaleBundle (`import { enUS } from './contracts'`)
   * - a BCP 47 locale code string (e.g. `'fr-FR'`) — consumers are
   *   responsible for resolving codes to bundles via `i18n.loadLocale`.
   */
  locale?: LocaleBundle | UpupLocaleCode
  cloudDrives?: CloudDrivesConfig
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
