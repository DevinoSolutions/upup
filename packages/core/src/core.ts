import { UploadStatus, type UploadFile, type PipelineStep, type PipelineContext } from '@upup/shared'
import { EventEmitter } from './events'
import { PluginManager, type UpupPlugin, type ExtensionMethods } from './plugin'
import { FileManager, type FileManagerOptions } from './file-manager'
import { PipelineEngine } from './pipeline/engine'
import { UploadManager } from './upload-manager'
import { TokenEndpointCredentials } from './strategies/token-endpoint'
import { DirectUpload } from './strategies/direct-upload'

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
  readonly options: CoreOptions

  constructor(options: CoreOptions) {
    this.options = options
    this.fileManager = new FileManager({
      accept: options.accept,
      limit: options.limit,
      minFiles: options.minFiles,
      maxFileSize: options.maxFileSize,
      minFileSize: options.minFileSize,
      maxTotalFileSize: options.maxTotalFileSize,
      contentDeduplication: options.contentDeduplication,
      onBeforeFileAdded: options.onBeforeFileAdded,
    })

    if (options.pipeline) {
      this.pipelineEngine = new PipelineEngine(options.pipeline)
    }

    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin)
      }
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
      this.emitter.emit('file-removed', file)
      this.emitter.emit('state-change', { files: this.files })
    }
  }

  removeAll(): void {
    this.fileManager.removeAll()
    this.emitter.emit('state-change', { files: this.files })
  }

  async setFiles(files: File[]): Promise<void> {
    await this.fileManager.setFiles(files)
    this.emitter.emit('state-change', { files: this.files })
  }

  reorderFiles(fromIndex: number, toIndex: number): void {
    this.fileManager.reorderFiles(fromIndex, toIndex)
    this.emitter.emit('state-change', { files: this.files })
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
      const credentialUrl = this.options.uploadEndpoint ?? `${this.options.serverUrl}/presign`
      const credentials = new TokenEndpointCredentials({ url: credentialUrl })
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

  getSnapshot(): unknown {
    return {
      files: [...this.files.entries()],
      status: this._status,
    }
  }

  restore(_snapshot: unknown): void {
    // Will be implemented in Task 2.9
  }

  destroy(): void {
    this.emitter.removeAllListeners()
    this.pluginManager.destroy()
    this.fileManager.removeAll()
    this._status = UploadStatus.IDLE
    this._error = null
  }
}
