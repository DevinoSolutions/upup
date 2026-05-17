import { UpupConfigError, UpupErrorCode } from './errors'
import { createTranslator } from './i18n/create-translator'
import { enUS } from './i18n/locales/en-US'
import type { LocaleBundle, UpupLocaleCode } from './i18n/types'
import type { PipelineContext, PipelineStep } from './contracts-pipeline'
import { FileSource } from './types/file-source'
import type { ResumableUploadOptions } from './types/upload-protocols'
import type { UploadFile } from './types/upload-file'
import { UploadStatus } from './types/upload-status'
import { EventEmitter, type EventHandler } from './events'
import type { CoreEvents } from './types/core-events'
import { PluginManager, type UpupPlugin, type ExtensionMethods } from './plugin'
import { FileManager, type FileManagerOptions, fileSizeInBytes, matchesAccept } from './file-manager'
import { PipelineEngine } from './pipeline/engine'
import { UploadManager } from './upload-manager'
import { TokenEndpointCredentials } from './strategies/token-endpoint'
import { ServerCredentials } from './strategies/server-credentials'
import { DirectUpload } from './strategies/direct-upload'
import { MultipartUpload } from './strategies/multipart-upload'
import { TusUpload } from './strategies/tus-upload'
import { CrashRecoveryManager, IndexedDBStorage, type PersistentStorage } from './crash-recovery'
import { WorkerPool } from './worker-pool'

export interface Restrictions {
  maxFileSize?: import('./contracts').MaxFileSizeObject
  minFileSize?: import('./contracts').MaxFileSizeObject
  maxTotalFileSize?: import('./contracts').MaxFileSizeObject
  maxNumberOfFiles?: number
  minNumberOfFiles?: number
  allowedFileTypes?: string[]
}

export interface GoogleDriveConfig {
  clientId: string
  apiKey: string
  appId: string
}

export interface OneDriveConfig {
  clientId: string
  authority?: string
}

export interface DropboxConfig {
  appKey: string
}

export interface CloudDrivesConfig {
  googleDrive?: GoogleDriveConfig
  oneDrive?: OneDriveConfig
  dropbox?: DropboxConfig
}

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
  maxRetries?: number
  maxConcurrentUploads?: number
  autoUpload?: boolean
  fastAbortThreshold?: number
  isSuccessfulCall?: (response: { status: number; headers: Record<string, string>; body: unknown }) => boolean | Promise<boolean>
  crashRecovery?: boolean | CrashRecoveryOptions
  onError?: (error: string | Error) => void
  googleDriveConfigs?: Record<string, unknown>
  oneDriveConfigs?: Record<string, unknown>
  dropboxConfigs?: Record<string, unknown>
  boxConfigs?: Record<string, unknown>
  metadata?: Record<string, unknown>
  cors?: UpupCorsConfig
  /**
   * i18n configuration. Accepts either:
   * - a full LocaleBundle (`import { enUS } from './contracts'`)
   * - a BCP 47 locale code string (e.g. `'fr-FR'`) — consumers are
   *   responsible for resolving codes to bundles via `i18n.loadLocale`.
   */
  locale?: LocaleBundle | UpupLocaleCode
  restrictions?: Restrictions
  cloudDrives?: CloudDrivesConfig
  enableWorkers?: boolean
  workerPoolSize?: number
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

type CrashRecoveryFileSnapshot = {
  file: File
  id: string
  name: string
  type: string
  lastModified?: number
  source: UploadFile['source']
  status: UploadStatus
  metadata: UploadFile['metadata']
  url?: string
  relativePath?: string
  key?: string
  etag?: string
  fileHash?: string
  checksumSHA256?: string
  thumbnail?: UploadFile['thumbnail']
}

type CoreCrashRecoverySnapshot = {
  files: [string, CrashRecoveryFileSnapshot | UploadFile][]
  status: UploadStatus
}

export class UpupCore {
  private emitter = new EventEmitter<CoreEvents>()
  private pluginManager = new PluginManager()
  private fileManager: FileManager
  private pipelineEngine: PipelineEngine | null = null
  private uploadManager: UploadManager | null = null
  private _status: UploadStatus = UploadStatus.IDLE
  private _error: Error | null = null
  private crashRecovery: CrashRecoveryManager | null = null
  private crashRecoveryUnsubscribe: (() => void) | null = null
  private workerPool?: WorkerPool
  private fileOverrides = new Map<string, Partial<UploadOptions>>()
  private pauseRequested = false
  private cancelRequested = false
  private destroyed = false
  options: CoreOptions

  constructor(options: CoreOptions) {
    this.options = { ...options }

    // Merge restrictions into flat options (flat takes precedence)
    if (options.restrictions) {
      const r = options.restrictions
      if (r.maxFileSize && !options.maxFileSize) this.options.maxFileSize = r.maxFileSize
      if (r.minFileSize && !options.minFileSize) this.options.minFileSize = r.minFileSize
      if (r.maxTotalFileSize && !options.maxTotalFileSize) this.options.maxTotalFileSize = r.maxTotalFileSize
      if (r.maxNumberOfFiles != null && !options.limit) this.options.limit = r.maxNumberOfFiles
      if (r.minNumberOfFiles != null && !options.minFiles) this.options.minFiles = r.minNumberOfFiles
      if (r.allowedFileTypes && !options.allowedFileTypes) this.options.allowedFileTypes = r.allowedFileTypes.join(',')
    }

    // Merge cloudDrives into flat options (flat takes precedence)
    if (options.cloudDrives) {
      const cd = options.cloudDrives
      if (cd.googleDrive && !options.googleDriveConfigs) {
        this.options.googleDriveConfigs = cd.googleDrive as unknown as Record<string, unknown>
      }
      if (cd.oneDrive && !options.oneDriveConfigs) {
        this.options.oneDriveConfigs = cd.oneDrive as unknown as Record<string, unknown>
      }
      if (cd.dropbox && !options.dropboxConfigs) {
        this.options.dropboxConfigs = cd.dropbox as unknown as Record<string, unknown>
      }
    }

    this.fileManager = new FileManager({
      allowedFileTypes: this.options.allowedFileTypes,
      limit: this.options.limit,
      minFiles: this.options.minFiles,
      maxFileSize: this.options.maxFileSize,
      minFileSize: this.options.minFileSize,
      maxTotalFileSize: this.options.maxTotalFileSize,
      contentDeduplication: this.options.contentDeduplication,
      onBeforeFileAdded: this.options.onBeforeFileAdded,
    })

    if (options.pipeline) {
      this.pipelineEngine = new PipelineEngine(options.pipeline)
    }
    // Auto-pipeline from boolean options is built lazily in upload() via buildAutoPipeline()

    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin)
      }
    }

    this.configureCrashRecovery(options.crashRecovery)

    if (options.enableWorkers) {
      this.workerPool = new WorkerPool({
        maxWorkers: options.workerPoolSize,
      })
    }
  }

  get files(): Map<string, UploadFile> {
    return this.fileManager.getFiles()
  }

  get status(): UploadStatus {
    return this._status
  }

  get error(): Error | null {
    return this._error
  }

  get progress(): { totalFiles: number; completedFiles: number; percentage: number } {
    const files = [...this.files.values()]
    const total = files.length
    const completed = files.filter(f => f.key != null).length
    return {
      totalFiles: total,
      completedFiles: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }

  private configureCrashRecovery(crashRecovery: CoreOptions['crashRecovery']): void {
    if (!crashRecovery || this.crashRecovery) return

    const crashOptions =
      typeof crashRecovery === 'object' && crashRecovery !== null
        ? crashRecovery
        : {}
    this.crashRecovery = new CrashRecoveryManager(crashOptions.storage ?? new IndexedDBStorage())
    this.crashRecoveryUnsubscribe = this.on('state-change', () => {
      if (this.destroyed || this.files.size === 0) return
      if (this._status === UploadStatus.SUCCESSFUL) {
        this.crashRecovery?.clear().catch(() => {})
        return
      }
      this.crashRecovery?.save(this.getCrashRecoverySnapshot()).catch(() => {})
    })
  }

  private disableCrashRecovery(): void {
    const manager = this.crashRecovery
    this.crashRecoveryUnsubscribe?.()
    this.crashRecoveryUnsubscribe = null
    this.crashRecovery = null
    manager?.clear().catch(() => {})
  }

  private getCrashRecoverySnapshot(): CoreCrashRecoverySnapshot {
    return {
      files: [...this.files.entries()].map(([id, file]) => [
        id,
        this.toCrashRecoveryFileSnapshot(id, file),
      ]),
      status: this._status,
    }
  }

  private toCrashRecoveryFileSnapshot(id: string, file: UploadFile): CrashRecoveryFileSnapshot {
    const snapshot: CrashRecoveryFileSnapshot = {
      file,
      id: file.id ?? id,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      source: file.source ?? FileSource.LOCAL,
      status: file.status ?? UploadStatus.IDLE,
      metadata: file.metadata ?? {},
    }

    if (file.url && !file.url.startsWith('blob:')) {
      snapshot.url = file.url
    }

    for (const key of ['relativePath', 'key', 'etag', 'fileHash', 'checksumSHA256'] as const) {
      if (file[key] !== undefined) {
        Object.assign(snapshot, { [key]: file[key] })
      }
    }
    if (file.thumbnail) {
      snapshot.thumbnail = file.thumbnail
    }

    return snapshot
  }

  private reviveCrashRecoverySnapshot(snapshot: unknown): { files: [string, UploadFile][]; status: UploadStatus } | null {
    if (!this.isRecord(snapshot) || !Array.isArray(snapshot.files)) {
      return null
    }

    const status = this.isUploadStatus(snapshot.status) ? snapshot.status : UploadStatus.IDLE
    const files = snapshot.files
      .map((entry, index): [string, UploadFile] | null => {
        if (!Array.isArray(entry) || entry.length < 2) return null
        const id = typeof entry[0] === 'string' ? entry[0] : `recovered-${index}`
        const file = this.reviveCrashRecoveryFile(id, entry[1], status)
        return file ? [id, file] : null
      })
      .filter((entry): entry is [string, UploadFile] => entry != null)

    return { files, status }
  }

  private reviveCrashRecoveryFile(id: string, value: unknown, fallbackStatus: UploadStatus): UploadFile | null {
    const isFileLike = typeof File !== 'undefined' && value instanceof File
    const wrappedBlob = this.isRecord(value) && typeof Blob !== 'undefined' && value.file instanceof Blob
      ? value.file
      : null
    const props = this.isRecord(value) && wrappedBlob ? value : this.isRecord(value) ? value : {}
    const nameFromProps = typeof props.name === 'string' && props.name.trim() !== ''
      ? props.name
      : undefined
    const file = wrappedBlob
      ? this.toRecoverableFile(wrappedBlob, nameFromProps ?? id, props)
      : isFileLike
        ? value as File
        : null
    if (!file) return null

    const metadata = this.isRecord(props.metadata)
      ? props.metadata as UploadFile['metadata']
      : {}
    const uploadStatus = this.isUploadStatus(props.status) ? props.status : fallbackStatus
    const source = Object.values(FileSource).includes(props.source as FileSource)
      ? props.source as FileSource
      : FileSource.LOCAL
    const uploadFile = Object.assign(file, {
      id: typeof props.id === 'string' ? props.id : id,
      source,
      status: uploadStatus,
      metadata,
    }) as UploadFile
    const url = typeof props.url === 'string' && !props.url.startsWith('blob:')
      ? props.url
      : this.createObjectUrl(file)
    if (url) {
      uploadFile.url = url
    }

    for (const key of ['relativePath', 'key', 'etag', 'fileHash', 'checksumSHA256'] as const) {
      if (typeof props[key] === 'string') {
        Object.assign(uploadFile, { [key]: props[key] })
      }
    }
    if (this.isRecord(props.thumbnail)) {
      uploadFile.thumbnail = props.thumbnail as UploadFile['thumbnail']
    }

    return uploadFile
  }

  private createObjectUrl(file: File): string | undefined {
    return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : undefined
  }

  private toRecoverableFile(blob: Blob, name: string, props: Record<string, unknown>): File | null {
    if (typeof File === 'undefined') return null
    if (blob instanceof File && blob.name) {
      return blob
    }
    const type = typeof props.type === 'string' ? props.type : blob.type
    const lastModified = typeof props.lastModified === 'number' ? props.lastModified : Date.now()
    return new File([blob], name, { type, lastModified })
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private isUploadStatus(value: unknown): value is UploadStatus {
    return Object.values(UploadStatus).includes(value as UploadStatus)
  }

  use(plugin: UpupPlugin): this {
    this.pluginManager.register(plugin, this)
    this.emitter.emit('plugin-registered', { name: plugin.name })
    return this
  }

  registerExtension(name: string, methods: ExtensionMethods): void {
    this.pluginManager.registerExtension(name, methods)
  }

  getExtension(name: string): ExtensionMethods | undefined {
    return this.pluginManager.getExtension(name)
  }

  get ext(): Record<string, ExtensionMethods> {
    return this.pluginManager.getExtensions()
  }

  async addFiles(files: File[], overrides?: Partial<UploadOptions>): Promise<void> {
    try {
      const added = await this.fileManager.addFiles(files)
      if (added.length > 0) {
        if (overrides) {
          for (const file of added) {
            this.fileOverrides.set(file.id, overrides)
          }
        }
        this.emitter.emit('files-added', added)
        this.emitter.emit('state-change', { files: this.files })
      }
      const rejectedCount = files.length - added.length
      if (rejectedCount > 0) {
        this.emitter.emit('file-rejected', { count: rejectedCount })
      }
    } catch (error) {
      this.emitter.emit('restriction-failed', { error })
      throw error
    }
  }

  removeFile(id: string): void {
    const file = this.fileManager.removeFile(id)
    if (file) {
      this.fileOverrides.delete(id)
      this.emitter.emit('file-removed', file)
      this.emitter.emit('state-change', { files: this.files })
    }
  }

  removeAll(): void {
    this.fileManager.removeAll()
    this.fileOverrides.clear()
    this.crashRecovery?.clear().catch(() => {})
    this.emitter.emit('state-change', { files: this.files })
    // v2: dedicated event so consumers know all files were cleared at once
    this.emitter.emit('files-cleared', {})
  }

  async setFiles(files: File[]): Promise<void> {
    await this.fileManager.setFiles(files)
    this.emitter.emit('state-change', { files: this.files })
    // v2: dedicated event so consumers can observe programmatic file replacement
    this.emitter.emit('files-set', { count: this.files.size })
  }

  /** Update options after construction (e.g. when React props change). */
  updateOptions(partial: Partial<CoreOptions>): void {
    const hadCrashRecovery = this.crashRecovery != null
    Object.assign(this.options, partial)

    if (partial.restrictions) {
      const r = partial.restrictions
      if (r.maxFileSize && !('maxFileSize' in partial)) this.options.maxFileSize = r.maxFileSize
      if (r.minFileSize && !('minFileSize' in partial)) this.options.minFileSize = r.minFileSize
      if (r.maxTotalFileSize && !('maxTotalFileSize' in partial)) this.options.maxTotalFileSize = r.maxTotalFileSize
      if (r.maxNumberOfFiles != null && !('limit' in partial)) this.options.limit = r.maxNumberOfFiles
      if (r.minNumberOfFiles != null && !('minFiles' in partial)) this.options.minFiles = r.minNumberOfFiles
      if (r.allowedFileTypes && !('allowedFileTypes' in partial)) this.options.allowedFileTypes = r.allowedFileTypes.join(',')
    }

    if (partial.cloudDrives) {
      const cd = partial.cloudDrives
      if (cd.googleDrive) {
        this.options.googleDriveConfigs = cd.googleDrive as unknown as Record<string, unknown>
      }
      if (cd.oneDrive) {
        this.options.oneDriveConfigs = cd.oneDrive as unknown as Record<string, unknown>
      }
      if (cd.dropbox) {
        this.options.dropboxConfigs = cd.dropbox as unknown as Record<string, unknown>
      }
    }

    this.fileManager.updateOptions({
      allowedFileTypes: this.options.allowedFileTypes,
      limit: this.options.limit,
      minFiles: this.options.minFiles,
      maxFileSize: this.options.maxFileSize,
      minFileSize: this.options.minFileSize,
      maxTotalFileSize: this.options.maxTotalFileSize,
      contentDeduplication: this.options.contentDeduplication,
      onBeforeFileAdded: this.options.onBeforeFileAdded,
    })

    if ('crashRecovery' in partial) {
      if (partial.crashRecovery) {
        this.configureCrashRecovery(partial.crashRecovery)
      } else if (hadCrashRecovery) {
        this.disableCrashRecovery()
      }
    }

    // v2: emit so consumers can observe option changes at runtime
    this.emitter.emit('options-updated', { partial })
  }

  reorderFiles(fileIds: string[]): void {
    this.fileManager.reorderFiles(fileIds)
    this.emitter.emit('state-change', { files: this.files })
    // v2: emit dedicated event so consumers can react specifically to reordering
    this.emitter.emit('files-reordered', { fileIds })
  }

  private async buildAutoPipeline(): Promise<PipelineStep[]> {
    const steps: PipelineStep[] = []

    if (this.options.heicConversion) {
      const { heicStep } = await import('./steps/heic')
      steps.push(heicStep())
    }

    if (this.options.stripExifData) {
      const { exifStep } = await import('./steps/exif')
      steps.push(exifStep())
    }

    if (this.options.imageCompression) {
      const { compressStep } = await import('./steps/compress')
      const opts = typeof this.options.imageCompression === 'object'
        ? this.options.imageCompression
        : {}
      steps.push(compressStep(opts))
    }

    if (this.options.thumbnailGenerator) {
      const { thumbnailStep } = await import('./steps/thumbnail')
      const opts = typeof this.options.thumbnailGenerator === 'object'
        ? this.options.thumbnailGenerator
        : {}
      steps.push(thumbnailStep(opts))
    }

    if (this.options.checksumVerification) {
      const { hashStep } = await import('./steps/hash')
      steps.push(hashStep())
    }

    return steps
  }

  private hasUploadTarget(): boolean {
    return Boolean(
      this.options.uploadEndpoint ||
      this.options.serverUrl ||
      this.options.resumable?.protocol === 'tus',
    )
  }

  private createUploadManager(): UploadManager {
    const tusOptions =
      this.options.resumable?.protocol === 'tus'
        ? this.options.resumable
        : null
    const configuredTargetCount = [
      this.options.uploadEndpoint,
      this.options.serverUrl,
      tusOptions?.endpoint,
    ].filter(Boolean).length

    if (configuredTargetCount > 1) {
      throw new UpupConfigError(
        'Configure exactly one upload target: uploadEndpoint, serverUrl, or resumable.protocol="tus" with endpoint.',
        'AMBIGUOUS_UPLOAD_TARGET',
      )
    }

    const credentials = this.options.serverUrl
      ? new ServerCredentials({
          serverUrl: this.options.serverUrl,
        })
      : this.options.uploadEndpoint
        ? new TokenEndpointCredentials({
            url: this.options.uploadEndpoint,
          })
        : {
            getPresignedUrl: async () => {
              throw new UpupConfigError('Tus uploads do not use presigned upload URLs.')
            },
          }
    const directUpload = new DirectUpload()
    const tusUpload = tusOptions ? new TusUpload(tusOptions) : null
    const multipartUpload =
      this.options.resumable?.protocol === 'multipart'
        ? new MultipartUpload({
            credentials,
            chunkSizeBytes: this.options.resumable.chunkSizeBytes,
          })
        : null
    const multipartThreshold =
      this.options.resumable?.protocol === 'multipart'
        ? this.options.resumable.thresholdBytes ?? 5 * 1024 * 1024
        : Number.POSITIVE_INFINITY

    return new UploadManager({
      credentials,
      uploadStrategy: directUpload,
      resolveUploadStrategy: (file) => {
        if (tusUpload) {
          return { uploadStrategy: tusUpload, presign: false }
        }
        const shouldUseMultipart = Boolean(
          multipartUpload && file.size >= multipartThreshold,
        )
        return shouldUseMultipart
          ? { uploadStrategy: multipartUpload!, presign: false }
          : { uploadStrategy: directUpload, presign: true }
      },
      maxConcurrentUploads: this.options.maxConcurrentUploads ?? 3,
      maxRetries: this.options.maxRetries,
      fastAbortThreshold: this.options.fastAbortThreshold,
      isSuccessfulCall: this.options.isSuccessfulCall,
      onFileStart: (file) => {
        const uploading = Object.assign(file, { status: UploadStatus.UPLOADING }) as UploadFile
        this.files.set(file.id, uploading)
        this.emitter.emit('file-upload-start', { file: uploading })
        this.emitter.emit('state-change', { files: this.files })
      },
      onProgress: (fileId, loaded, total) => {
        this.emitter.emit('upload-progress', { fileId, loaded, total })
        this.emitter.emit('state-change', { progress: this.progress })
      },
      onFileComplete: (file, result) => {
        if (
          this.pauseRequested ||
          this.cancelRequested ||
          this.destroyed ||
          !this.files.has(file.id)
        ) return
        const updated = Object.assign(file, { key: result.key, status: UploadStatus.SUCCESSFUL }) as UploadFile
        this.files.set(file.id, updated)
        this.emitter.emit('upload-success', { file: updated, result })
        this.emitter.emit('state-change', { files: this.files })
      },
      onFileError: (file, error) => {
        if (
          this.pauseRequested ||
          this.cancelRequested ||
          this.destroyed ||
          !this.files.has(file.id)
        ) return
        const failed = Object.assign(file, { status: UploadStatus.FAILED }) as UploadFile
        this.files.set(file.id, failed)
        this.emitter.emit('upload-error', { file: failed, error })
        this.emitter.emit('state-change', { files: this.files })
      },
    })
  }

  private markFilesReady(files: UploadFile[]): UploadFile[] {
    return files.map(file => {
      const overrides = this.fileOverrides.get(file.id)
      const ready = Object.assign(file, {
        status: UploadStatus.READY,
        metadata: {
          ...file.metadata,
          ...this.options.metadata,
          ...overrides?.metadata,
        },
      }) as UploadFile
      this.files.set(file.id, ready)
      return ready
    })
  }

  private updatePendingFileStatuses(status: UploadStatus): void {
    for (const file of this.files.values()) {
      if (
        file.key == null &&
        (
          file.status === UploadStatus.READY ||
          file.status === UploadStatus.UPLOADING ||
          file.status === UploadStatus.PROCESSING ||
        file.status === UploadStatus.PAUSED
      )
    ) {
        Object.assign(file, { status })
        this.files.set(file.id, file)
      }
    }
  }

  private markUnsuccessfulFilesFailed(): void {
    for (const file of this.files.values()) {
      if (file.key == null && file.status !== UploadStatus.SUCCESSFUL) {
        Object.assign(file, { status: UploadStatus.FAILED })
        this.files.set(file.id, file)
      }
    }
  }

  private async uploadFiles(files: UploadFile[]): Promise<UploadFile[]> {
    const targetFiles = this.markFilesReady(files)
    this.emitter.emit('state-change', { files: this.files })

    if (!this.hasUploadTarget()) {
      throw new UpupConfigError(
        'No upload target configured. Use selected files directly for local-only flows, or configure uploadEndpoint, serverUrl, or an external Tus endpoint before calling upload().',
      )
    }

    this.uploadManager = this.createUploadManager()
    await this.uploadManager.uploadAll(targetFiles)
    this.uploadManager = null
    return [...this.files.values()]
  }

  async validateFiles(files: File[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const file of files) {
      const errors: Array<{ code: string; message: string }> = []

      if (this.options.allowedFileTypes && !matchesAccept(file, this.options.allowedFileTypes)) {
        errors.push({
          code: UpupErrorCode.TYPE_MISMATCH,
          message: `File type "${file.type}" is not accepted`,
        })
      }

      if (this.options.maxFileSize) {
        const maxBytes = fileSizeInBytes(this.options.maxFileSize)
        if (file.size > maxBytes) {
          errors.push({
            code: UpupErrorCode.FILE_TOO_LARGE,
            message: `File "${file.name}" exceeds maximum size`,
          })
        }
      }

      if (this.options.minFileSize) {
        const minBytes = fileSizeInBytes(this.options.minFileSize)
        if (file.size < minBytes) {
          errors.push({
            code: UpupErrorCode.FILE_TOO_SMALL,
            message: `File "${file.name}" is below minimum size`,
          })
        }
      }

      results.push({
        file,
        valid: errors.length === 0,
        errors,
      })
    }

    return results
  }

  async upload(): Promise<UploadFile[]> {
    this.pauseRequested = false
    this.cancelRequested = false
    this.destroyed = false
    this._status = UploadStatus.PROCESSING
    this.emitter.emit('upload-start', {})
    this.emitter.emit('state-change', { status: this._status })

    try {
      // Build auto-pipeline lazily from boolean options if no explicit pipeline
      if (!this.pipelineEngine) {
        const autoSteps = await this.buildAutoPipeline()
        if (autoSteps.length > 0) {
          this.pipelineEngine = new PipelineEngine(autoSteps)
        }
      }

      if (this.pipelineEngine) {
        const translator = createTranslator({ bundle: enUS })
        const context: PipelineContext = {
          files: this.files,
          options: this.options as Record<string, unknown>,
          emit: (event, data) => this.emitter.emit(event, data),
          t: (key: string, vars?: Record<string, unknown>) => translator(key as Parameters<typeof translator>[0], vars),
        }
        const processed = await this.pipelineEngine.processAll([...this.files.values()], context)
        for (const file of processed) {
          this.files.set(file.id, file)
        }
      }

      this._status = UploadStatus.UPLOADING
      this.emitter.emit('state-change', { status: this._status })

      // Only run actual uploads if credentials/endpoint are configured
      await this.uploadFiles([...this.files.values()])

      this._status = UploadStatus.SUCCESSFUL
      this._error = null
      this.emitter.emit('upload-all-complete', [...this.files.values()])
      this.emitter.emit('state-change', { status: this._status })
      this.crashRecovery?.clear().catch(() => {})

      return [...this.files.values()]
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.uploadManager = null
      if (this.pauseRequested) {
        this._status = UploadStatus.PAUSED
        this._error = null
        this.emitter.emit('state-change', { status: this._status })
        return [...this.files.values()]
      }
      if (this.cancelRequested || this.destroyed) {
        this._status = UploadStatus.IDLE
        this._error = null
        this.emitter.emit('state-change', { status: this._status })
        return [...this.files.values()]
      }
      this._status = UploadStatus.FAILED
      this._error = err
      this.markUnsuccessfulFilesFailed()
      this.options.onError?.(err)
      this.emitter.emit('upload-error', { error: err })
      this.emitter.emit('state-change', { status: this._status, error: err, files: this.files })
      throw err
    }
  }

  replaceFile(id: string, file: File | UploadFile): void {
    const next = this.fileManager.replaceFile(id, file)
    this.emitter.emit('file-replaced', { file: next })
    this.emitter.emit('state-change', { files: this.files })
  }

  /**
   * Pause in-flight uploads by aborting the current abort controller.
   * Note: This cancels active HTTP requests. Resume will re-upload
   * files that were in progress — true pause/resume of partial uploads
   * requires multipart upload support.
   */
  pause(): void {
    if (this.uploadManager) {
      this.pauseRequested = true
      this.uploadManager.abort()
      this.uploadManager = null
    }
    this.updatePendingFileStatuses(UploadStatus.PAUSED)
    this._status = UploadStatus.PAUSED
    this.emitter.emit('upload-pause', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  /**
   * Resume uploads after a pause. Re-uploads files that did not
   * complete successfully (those without a `key` set).
   */
  resume(): void {
    this.pauseRequested = false
    this._status = UploadStatus.UPLOADING
    this.emitter.emit('upload-resume', {})
    this.emitter.emit('state-change', { status: this._status })

    const incomplete = [...this.files.values()].filter(f => f.key == null)
    if (incomplete.length > 0 && this.hasUploadTarget()) {
      this.uploadFiles(incomplete)
        .then(() => {
          const allComplete = [...this.files.values()].every(file => file.key != null)
          this._status = allComplete ? UploadStatus.SUCCESSFUL : UploadStatus.IDLE
          this.emitter.emit('state-change', { status: this._status })
        })
        .catch((err) => {
          if (this.pauseRequested || this.cancelRequested || this.destroyed) return
          this._status = UploadStatus.FAILED
          this._error = err instanceof Error ? err : new Error(String(err))
          this.emitter.emit('error', { error: this._error })
          this.emitter.emit('state-change', { status: this._status, error: this._error })
        })
    }
  }

  cancel(): void {
    this.cancelRequested = true
    if (this.uploadManager) {
      this.uploadManager.abort()
      this.uploadManager = null
    }
    this.updatePendingFileStatuses(UploadStatus.IDLE)
    this._status = UploadStatus.IDLE
    this._error = null
    this.emitter.emit('upload-cancel', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  async retry(fileId?: string): Promise<UploadFile[]> {
    this.emitter.emit('retry', { fileId })

    const target = fileId
      ? this.files.get(fileId)
      : undefined
    const files = fileId
      ? (target ? [target] : [])
      : [...this.files.values()].filter(file => file.key == null || file.status === UploadStatus.FAILED)

    if (files.length === 0) {
      return [...this.files.values()]
    }

    this._status = UploadStatus.UPLOADING
    this._error = null
    this.emitter.emit('upload-start', { retry: true, fileId })
    this.emitter.emit('state-change', { status: this._status })

    try {
      const uploaded = await this.uploadFiles(files)
      const allComplete = [...this.files.values()].every(file => file.key != null)
      this._status = allComplete ? UploadStatus.SUCCESSFUL : UploadStatus.IDLE
      if (allComplete) {
        this.emitter.emit('upload-all-complete', [...this.files.values()])
        this.crashRecovery?.clear().catch(() => {})
      }
      this.emitter.emit('state-change', { status: this._status })
      return uploaded
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.uploadManager = null
      this._status = UploadStatus.FAILED
      this._error = err
      this.options.onError?.(err)
      this.emitter.emit('upload-error', { error: err })
      this.emitter.emit('state-change', { status: this._status, error: err })
      throw err
    }
  }

  on<K extends string & keyof CoreEvents>(event: K, handler: (payload: CoreEvents[K]) => void): () => void
  on<K extends string>(event: K, handler: (payload: unknown) => void): () => void
  on(event: string, handler: (payload: unknown) => void): () => void {
    return this.emitter.on(event, handler as EventHandler<unknown>)
  }

  off(event: string, handler: (payload: unknown) => void): void {
    this.emitter.off(event, handler as EventHandler<unknown>)
  }

  emit<K extends string & keyof CoreEvents>(event: K, payload: CoreEvents[K]): void
  emit<K extends string>(event: K, data?: unknown): void
  emit(event: string, data?: unknown): void {
    this.emitter.emit(event, data)
  }

  getSnapshot(): { files: [string, UploadFile][]; status: UploadStatus } {
    return {
      files: [...this.files.entries()],
      status: this._status,
    }
  }

  restore(snapshot: { files: [string, UploadFile][]; status: UploadStatus }): void {
    const fileMap = this.fileManager.getFiles()
    fileMap.clear()
    for (const [id, file] of snapshot.files) {
      fileMap.set(id, file)
    }
    this._status = snapshot.status
    this.emitter.emit('state-change', { files: this.files, status: this._status })
    // v2: emit dedicated event so consumers know a snapshot was applied
    this.emitter.emit('snapshot-restored', { count: snapshot.files.length, status: snapshot.status })
  }

  async restoreFromCrashRecovery(): Promise<boolean> {
    if (!this.crashRecovery) return false
    const snapshot = await this.crashRecovery.restore()
    const restored = this.reviveCrashRecoverySnapshot(snapshot)
    if (restored && restored.files.length > 0) {
      const wasActive =
        restored.status === UploadStatus.PROCESSING ||
        restored.status === UploadStatus.UPLOADING
      const normalized = {
        files: restored.files.map(([id, file]) => {
          if (
            wasActive &&
            file.key == null &&
            (
              file.status === UploadStatus.PROCESSING ||
              file.status === UploadStatus.UPLOADING ||
              file.status === UploadStatus.READY ||
              file.status === UploadStatus.IDLE
            )
          ) {
            return [id, Object.assign(file, { status: UploadStatus.PAUSED })] as [string, UploadFile]
          }
          return [id, file] as [string, UploadFile]
        }),
        status: wasActive ? UploadStatus.PAUSED : restored.status,
      }
      this.restore(normalized)
      // v2: emit dedicated event so consumers know crash recovery was applied
      this.emitter.emit('crash-recovery-restored', {})
      return true
    }
    return false
  }

  async clearCrashRecovery(): Promise<void> {
    await this.crashRecovery?.clear()
  }

  destroy(): void {
    this.destroyed = true
    this.uploadManager?.abort()
    this.uploadManager = null
    // v2: emit before clearing listeners so teardown handlers fire
    this.emitter.emit('destroyed', {})
    this.crashRecoveryUnsubscribe?.()
    this.crashRecoveryUnsubscribe = null
    this.workerPool?.destroy()
    this.fileOverrides.clear()
    this.emitter.removeAllListeners()
    this.pluginManager.destroy()
    this.fileManager.removeAll()
    this._status = UploadStatus.IDLE
    this._error = null
  }
}
