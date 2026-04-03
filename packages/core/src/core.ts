import { UploadStatus, UpupErrorCode, type UploadFile, type PipelineStep, type PipelineContext } from '@upup/shared'
import { EventEmitter } from './events'
import { PluginManager, type UpupPlugin, type ExtensionMethods } from './plugin'
import { FileManager, type FileManagerOptions, fileSizeInBytes, matchesAccept } from './file-manager'
import { PipelineEngine } from './pipeline/engine'
import { UploadManager } from './upload-manager'
import { TokenEndpointCredentials } from './strategies/token-endpoint'
import { ServerCredentials } from './strategies/server-credentials'
import { DirectUpload } from './strategies/direct-upload'
import { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
import { WorkerPool } from './worker-pool'
import { heicStep } from './steps/heic'
import { exifStep } from './steps/exif'
import { compressStep } from './steps/compress'
import { thumbnailStep } from './steps/thumbnail'
import { hashStep } from './steps/hash'

export interface Restrictions {
  maxFileSize?: import('@upup/shared').MaxFileSizeObject
  minFileSize?: import('@upup/shared').MaxFileSizeObject
  maxTotalFileSize?: import('@upup/shared').MaxFileSizeObject
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

export interface CoreOptions extends FileManagerOptions {
  uploadEndpoint?: string
  serverUrl?: string
  apiKey?: string
  provider?: string
  plugins?: UpupPlugin[]
  pipeline?: PipelineStep[]
  heicConversion?: boolean
  stripExifData?: boolean
  imageCompression?: boolean | object
  thumbnailGenerator?: boolean | object
  shouldCompress?: boolean
  checksumVerification?: boolean
  maxRetries?: number
  maxConcurrentUploads?: number
  autoUpload?: boolean
  fastAbortThreshold?: number
  isSuccessfulCall?: (response: { status: number; headers: Record<string, string>; body: unknown }) => boolean | Promise<boolean>
  crashRecovery?: boolean | object
  onError?: (error: string | Error) => void
  googleDriveConfigs?: Record<string, unknown>
  oneDriveConfigs?: Record<string, unknown>
  dropboxConfigs?: Record<string, unknown>
  driveConfigs?: Record<string, unknown>
  meta?: Record<string, unknown>
  locale?: unknown
  translations?: unknown
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

export class UpupCore {
  private emitter = new EventEmitter()
  private pluginManager = new PluginManager()
  private fileManager: FileManager
  private pipelineEngine: PipelineEngine | null = null
  private uploadManager: UploadManager | null = null
  private _status: UploadStatus = UploadStatus.IDLE
  private _error: Error | null = null
  private crashRecovery: CrashRecoveryManager | null = null
  private workerPool?: WorkerPool
  private fileOverrides = new Map<string, Partial<UploadOptions>>()
  options: CoreOptions

  constructor(options: CoreOptions) {
    this.options = { ...options }

    // When apiKey is set and serverUrl is not, auto-set to managed endpoint
    if (this.options.apiKey && !this.options.serverUrl) {
      this.options.serverUrl = 'https://api.upup.dev/v1'
    }

    // Merge restrictions into flat options (flat takes precedence)
    if (options.restrictions) {
      const r = options.restrictions
      if (r.maxFileSize && !options.maxFileSize) this.options.maxFileSize = r.maxFileSize
      if (r.minFileSize && !options.minFileSize) this.options.minFileSize = r.minFileSize
      if (r.maxTotalFileSize && !options.maxTotalFileSize) this.options.maxTotalFileSize = r.maxTotalFileSize
      if (r.maxNumberOfFiles != null && !options.limit) this.options.limit = r.maxNumberOfFiles
      if (r.minNumberOfFiles != null && !options.minFiles) this.options.minFiles = r.minNumberOfFiles
      if (r.allowedFileTypes && !options.accept) this.options.accept = r.allowedFileTypes.join(',')
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
      accept: this.options.accept,
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
    } else {
      const autoSteps = this.buildAutoPipeline()
      if (autoSteps.length > 0) {
        this.pipelineEngine = new PipelineEngine(autoSteps)
      }
    }

    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin)
      }
    }

    if (options.crashRecovery) {
      this.crashRecovery = new CrashRecoveryManager(new IndexedDBStorage())
      this.on('state-change', () => {
        this.crashRecovery?.save(this.getSnapshot()).catch(() => {})
      })
    }

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
    this.emitter.emit('state-change', { files: this.files })
  }

  async setFiles(files: File[]): Promise<void> {
    await this.fileManager.setFiles(files)
    this.emitter.emit('state-change', { files: this.files })
  }

  reorderFiles(fileIds: string[]): void {
    this.fileManager.reorderFiles(fileIds)
    this.emitter.emit('state-change', { files: this.files })
  }

  private buildAutoPipeline(): PipelineStep[] {
    const steps: PipelineStep[] = []

    if (this.options.heicConversion) {
      steps.push(heicStep())
    }

    if (this.options.stripExifData) {
      steps.push(exifStep())
    }

    if (this.options.imageCompression || this.options.shouldCompress) {
      const opts = typeof this.options.imageCompression === 'object'
        ? this.options.imageCompression
        : {}
      steps.push(compressStep(opts))
    }

    if (this.options.thumbnailGenerator) {
      const opts = typeof this.options.thumbnailGenerator === 'object'
        ? this.options.thumbnailGenerator
        : {}
      steps.push(thumbnailStep(opts))
    }

    if (this.options.checksumVerification) {
      steps.push(hashStep())
    }

    return steps
  }

  async validateFiles(files: File[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const file of files) {
      const errors: Array<{ code: string; message: string }> = []

      if (this.options.accept && !matchesAccept(file, this.options.accept)) {
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
    this._status = UploadStatus.PROCESSING
    this.emitter.emit('upload-start', {})
    this.emitter.emit('state-change', { status: this._status })

    if (this.pipelineEngine) {
      const context: PipelineContext = {
        files: this.files,
        options: this.options as Record<string, unknown>,
        emit: (event, data) => this.emitter.emit(event, data),
        t: (key: string) => key,
      }
      const processed = await this.pipelineEngine.processAll([...this.files.values()], context)
      for (const file of processed) {
        this.files.set(file.id, file)
      }
    }

    this._status = UploadStatus.UPLOADING
    this.emitter.emit('state-change', { status: this._status })

    // Only run actual uploads if credentials/endpoint are configured
    if (this.options.uploadEndpoint || this.options.serverUrl) {
      const credentials = this.options.apiKey
        ? new ServerCredentials({
            serverUrl: this.options.serverUrl!,
            apiKey: this.options.apiKey,
          })
        : new TokenEndpointCredentials({
            url: this.options.uploadEndpoint ?? `${this.options.serverUrl}/presign`,
          })
      const uploadStrategy = new DirectUpload()

      this.uploadManager = new UploadManager({
        credentials,
        uploadStrategy,
        maxConcurrentUploads: this.options.maxConcurrentUploads ?? 3,
        maxRetries: this.options.maxRetries,
        fastAbortThreshold: this.options.fastAbortThreshold,
        isSuccessfulCall: this.options.isSuccessfulCall,
        onProgress: (fileId, loaded, total) => {
          this.emitter.emit('upload-progress', { fileId, loaded, total })
          this.emitter.emit('state-change', { progress: this.progress })
        },
        onFileComplete: (file, result) => {
          // Update the file with its key from the result
          const updated = { ...file, key: result.key } as UploadFile
          this.files.set(file.id, updated)
          this.emitter.emit('upload-success', { file: updated, result })
          this.emitter.emit('state-change', { files: this.files })
        },
        onFileError: (file, error) => {
          this.emitter.emit('upload-error', { file, error })
        },
      })

      await this.uploadManager.uploadAll([...this.files.values()])
      this.uploadManager = null
    }

    this._status = UploadStatus.SUCCESSFUL
    this.emitter.emit('upload-all-complete', [...this.files.values()])
    this.emitter.emit('state-change', { status: this._status })
    this.crashRecovery?.clear().catch(() => {})

    return [...this.files.values()]
  }

  /**
   * Pause in-flight uploads by aborting the current abort controller.
   * Note: This cancels active HTTP requests. Resume will re-upload
   * files that were in progress — true pause/resume of partial uploads
   * requires multipart upload support.
   */
  pause(): void {
    if (this.uploadManager) {
      this.uploadManager.pause()
    }
    this._status = UploadStatus.PAUSED
    this.emitter.emit('upload-pause', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  /**
   * Resume uploads after a pause. Re-uploads files that did not
   * complete successfully (those without a `key` set).
   */
  resume(): void {
    this._status = UploadStatus.UPLOADING
    this.emitter.emit('upload-resume', {})
    this.emitter.emit('state-change', { status: this._status })

    // Re-upload files that were not completed
    if (this.uploadManager) {
      const incomplete = [...this.files.values()].filter(f => f.key == null)
      if (incomplete.length > 0) {
        this.uploadManager.uploadAll(incomplete).catch((err) => {
          this._status = UploadStatus.FAILED
          this.emitter.emit('error', { error: err })
          this.emitter.emit('state-change', { status: this._status })
        })
      }
    }
  }

  cancel(): void {
    if (this.uploadManager) {
      this.uploadManager.abort()
      this.uploadManager = null
    }
    this._status = UploadStatus.IDLE
    this.emitter.emit('upload-cancel', {})
    this.emitter.emit('state-change', { status: this._status })
  }

  retry(_fileId?: string): void {
    this.emitter.emit('retry', { fileId: _fileId })
  }

  on(event: string, handler: (...args: unknown[]) => void): () => void {
    return this.emitter.on(event, handler)
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler)
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
  }

  async restoreFromCrashRecovery(): Promise<boolean> {
    if (!this.crashRecovery) return false
    const snapshot = await this.crashRecovery.restore()
    if (snapshot && typeof snapshot === 'object' && 'files' in snapshot) {
      this.restore(snapshot as { files: [string, UploadFile][]; status: UploadStatus })
      return true
    }
    return false
  }

  async clearCrashRecovery(): Promise<void> {
    await this.crashRecovery?.clear()
  }

  destroy(): void {
    this.workerPool?.destroy()
    this.fileOverrides.clear()
    this.emitter.removeAllListeners()
    this.pluginManager.destroy()
    this.fileManager.removeAll()
    this.crashRecovery?.clear().catch(() => {})
    this._status = UploadStatus.IDLE
    this._error = null
  }
}
