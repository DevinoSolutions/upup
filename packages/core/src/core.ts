import { UpupConfigError, UpupErrorCode } from './errors'
import { createTranslator } from './i18n/create-translator'
import { enUS } from './i18n/locales/en-US'
import { resolveLocaleBundle } from './i18n/resolve-locale'
import type { LocaleBundle, UpupLocaleCode } from './i18n/types'
import type { PipelineContext, PipelineStep } from './contracts-pipeline'
import type { ResumableUploadOptions } from './types/upload-protocols'
import type { UploadFile } from './types/upload-file'
import { UploadStatus } from './types/upload-status'
import { EventEmitter, type EventHandler } from './events'
import type { CoreEvents } from './types/core-events'
import { PluginManager, type UpupPlugin, type ExtensionMethods } from './plugin'
import type { DrivePlugin } from './drives/plugin'
import { FileManager, type FileManagerOptions } from './file-manager'
import { validateFileRestrictions } from './validate-file-restrictions'
import { PipelineEngine } from './pipeline/engine'
import { buildAutoPipeline } from './pipeline/build-auto-pipeline'
import { UploadManager } from './upload-manager'
import { resolveUploadConfig } from './resolve-upload-config'
import { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
import { serializeCrashRecovery, reviveCrashRecoverySnapshot } from './crash-recovery-serializer'

import type { CoreOptions, ValidationResult, UploadOptions } from './options/types'
export type {
  GoogleDriveConfig,
  OneDriveConfig,
  DropboxConfig,
  BoxConfig,
  CloudDrivesConfig,
  UpupCorsConfig,
  CrashRecoveryOptions,
  CoreOptions,
  ValidationResult,
  UploadOptions,
} from './options/types'


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
  private fileOverrides = new Map<string, Partial<UploadOptions>>()
  private pauseRequested = false
  private cancelRequested = false
  private destroyed = false
  private activeRun: Promise<UploadFile[]> | null = null
  private workerProvider: import('./worker/create-worker-provider').WorkerProvider | null = null
  options: CoreOptions

  constructor(options: CoreOptions) {
    this.options = { ...options }

    this.fileManager = new FileManager({
      allowedFileTypes: this.options.allowedFileTypes,
      limit: this.options.limit,
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
      this.crashRecovery?.save(serializeCrashRecovery(this.files, this._status)).catch(() => {})
    })
  }

  private disableCrashRecovery(): void {
    const manager = this.crashRecovery
    this.crashRecoveryUnsubscribe?.()
    this.crashRecoveryUnsubscribe = null
    this.crashRecovery = null
    manager?.clear().catch(() => {})
  }

  use(plugin: UpupPlugin): this {
    this.pluginManager.register(plugin, this)
    // Drive plugins (Google Drive, Dropbox, OneDrive, Box) emit their events
    // through an emitter handed to them via init(). Wire it to core's event bus
    // here so events like 'google-drive:files-loaded' actually reach core.on()
    // subscribers. Without this, drive plugins fetch successfully but every event is
    // silently dropped — e.g. the drive browser stays stuck on its spinner.
    const drivePlugin = plugin as Partial<DrivePlugin>
    if (typeof drivePlugin.init === 'function') {
      drivePlugin.init(this.emitter as unknown as EventEmitter)
    }
    this.emitter.emit('plugin-registered', { name: plugin.name })
    return this
  }

  registerExtension(name: string, methods: ExtensionMethods): void {
    this.pluginManager.registerExtension(name, methods)
  }

  getPlugin(name: string): UpupPlugin | undefined {
    return this.pluginManager.getPlugin(name)
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
    this.emitter.emit('files-cleared', {})
  }

  async setFiles(files: File[]): Promise<void> {
    await this.fileManager.setFiles(files)
    this.emitter.emit('state-change', { files: this.files })
    this.emitter.emit('files-set', { count: this.files.size })
  }

  /** Update options after construction (e.g. when React props change). */
  updateOptions(partial: Partial<CoreOptions>): void {
    const hadCrashRecovery = this.crashRecovery != null
    Object.assign(this.options, partial)

    this.fileManager.updateOptions({
      allowedFileTypes: this.options.allowedFileTypes,
      limit: this.options.limit,
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

    this.emitter.emit('options-updated', { partial })
  }

  reorderFiles(fileIds: string[]): void {
    this.fileManager.reorderFiles(fileIds)
    this.emitter.emit('state-change', { files: this.files })
    this.emitter.emit('files-reordered', { fileIds })
  }

  private async maybeCreateWorkerProvider(stepCount: number): Promise<import('./worker/create-worker-provider').WorkerProvider | null> {
    const { isWorkerEligible } = await import('./worker/eligibility')
    if (!isWorkerEligible(this.options, typeof Worker !== 'undefined', stepCount)) return null
    try {
      const [{ createWorkerProvider }, { BrowserRuntime }] = await Promise.all([
        import('./worker/create-worker-provider'),
        import('./runtime/browser'),
      ])
      return createWorkerProvider(BrowserRuntime, { timeoutMs: this.options.workerTimeoutMs })
    } catch (err) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn('[upup] worker offload unavailable, falling back to main thread', err)
      }
      return null
    }
  }

  private hasUploadTarget(): boolean {
    return Boolean(
      this.options.uploadEndpoint ||
      this.options.serverUrl ||
      this.options.resumable?.protocol === 'tus',
    )
  }

  private createUploadManager(): UploadManager {
    const config = resolveUploadConfig(this.options)
    return new UploadManager({
      ...config,
      onFileStart: (file) => {
        const uploading = this.fileManager.updateFile(file.id, { status: UploadStatus.UPLOADING })
        if (!uploading) return
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
          this.destroyed
        ) return
        const updated = this.fileManager.updateFile(file.id, { key: result.key, status: UploadStatus.SUCCESSFUL })
        if (!updated) return
        this.emitter.emit('upload-success', { file: updated, result })
        this.emitter.emit('state-change', { files: this.files })
      },
      onFileError: (file, error) => {
        if (
          this.pauseRequested ||
          this.cancelRequested ||
          this.destroyed
        ) return
        const failed = this.fileManager.updateFile(file.id, { status: UploadStatus.FAILED })
        if (!failed) return
        this.emitter.emit('upload-error', { file: failed, error })
        this.emitter.emit('state-change', { files: this.files })
      },
    })
  }

  private markFilesReady(files: UploadFile[]): UploadFile[] {
    return files
      .map(file => {
        const overrides = this.fileOverrides.get(file.id)
        return this.fileManager.updateFile(file.id, {
          status: UploadStatus.READY,
          metadata: {
            ...file.metadata,
            ...this.options.metadata,
            ...overrides?.metadata,
          },
        })
      })
      .filter((file): file is UploadFile => file !== undefined)
  }

  private updatePendingFileStatuses(status: UploadStatus): void {
    for (const file of [...this.files.values()]) {
      if (
        file.key == null &&
        (
          file.status === UploadStatus.READY ||
          file.status === UploadStatus.UPLOADING ||
          file.status === UploadStatus.PROCESSING ||
        file.status === UploadStatus.PAUSED
      )
    ) {
        this.fileManager.updateFile(file.id, { status })
      }
    }
  }

  private markUnsuccessfulFilesFailed(): void {
    for (const file of [...this.files.values()]) {
      if (file.key == null && file.status !== UploadStatus.SUCCESSFUL) {
        this.fileManager.updateFile(file.id, { status: UploadStatus.FAILED })
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
    return files.map(file => {
      const errors = validateFileRestrictions(file, this.options)
      return { file, valid: errors.length === 0, errors }
    })
  }

  async upload(): Promise<UploadFile[]> {
    if (this.destroyed) throw new Error('UpupCore: upload() after destroy()')
    if (this.activeRun) return this.activeRun
    this.activeRun = this.runUpload()
    try {
      return await this.activeRun
    } finally {
      this.activeRun = null
    }
  }

  private async runUpload(): Promise<UploadFile[]> {
    this.pauseRequested = false
    this.cancelRequested = false
    this.destroyed = false
    this._status = UploadStatus.PROCESSING
    this.emitter.emit('upload-start', {})
    this.emitter.emit('state-change', { status: this._status })

    try {
      // Build auto-pipeline lazily from boolean options if no explicit pipeline
      if (!this.pipelineEngine) {
        const autoSteps = await buildAutoPipeline(this.options)
        if (autoSteps.length > 0) {
          this.pipelineEngine = new PipelineEngine(autoSteps)
        }
      }

      if (this.pipelineEngine) {
        const translator = createTranslator({ bundle: resolveLocaleBundle(this.options.locale) ?? enUS, fallback: enUS })
        const provider = await this.maybeCreateWorkerProvider(this.pipelineEngine.stepCount)
        this.workerProvider = provider
        try {
          const context: PipelineContext = {
            files: this.files,
            options: this.options as Record<string, unknown>,
            emit: (event, data) => this.emitter.emit(event, data),
            t: (key: string, vars?: Record<string, unknown>) => translator(key as Parameters<typeof translator>[0], vars),
            worker: provider
              ? { execute: <T>(task: { type: string; data: ArrayBuffer; params?: Record<string, unknown> }) => provider.execute<T>(task) }
              : undefined,
          }
          const processed = await this.pipelineEngine.processAll([...this.files.values()], context)
          for (const file of processed) {
            this.files.set(file.id, file)
          }
        } finally {
          provider?.terminate()
          this.workerProvider = null
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
    if (this.activeRun) return
    this.pauseRequested = false
    this._status = UploadStatus.UPLOADING
    this.emitter.emit('upload-resume', {})
    this.emitter.emit('state-change', { status: this._status })

    const incomplete = [...this.files.values()].filter(f => f.key == null)
    if (incomplete.length > 0 && this.hasUploadTarget()) {
      const run = this.uploadFiles(incomplete)
      this.activeRun = run
      run
        .then(() => {
          const allComplete = [...this.files.values()].every(file => file.key != null)
          this._status = allComplete ? UploadStatus.SUCCESSFUL : UploadStatus.IDLE
          this.emitter.emit('state-change', { status: this._status })
        })
        .catch((err) => {
          if (this.pauseRequested || this.cancelRequested || this.destroyed) return
          this._status = UploadStatus.FAILED
          this._error = err instanceof Error ? err : new Error(String(err))
          this.emitter.emit('upload-error', { error: this._error })
          this.emitter.emit('state-change', { status: this._status, error: this._error })
        })
        .finally(() => {
          this.activeRun = null
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
    if (this.activeRun) return this.activeRun
    this.activeRun = this.runRetry(fileId)
    try {
      return await this.activeRun
    } finally {
      this.activeRun = null
    }
  }

  private async runRetry(fileId?: string): Promise<UploadFile[]> {
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
    this.emitter.emit('snapshot-restored', { count: snapshot.files.length, status: snapshot.status })
  }

  async restoreFromCrashRecovery(): Promise<boolean> {
    if (!this.crashRecovery) return false
    const snapshot = await this.crashRecovery.restore()
    const restored = reviveCrashRecoverySnapshot(snapshot)
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
    this.workerProvider?.terminate()
    this.workerProvider = null
    this.emitter.emit('destroyed', {})
    this.crashRecoveryUnsubscribe?.()
    this.crashRecoveryUnsubscribe = null
    this.fileOverrides.clear()
    this.emitter.removeAllListeners()
    this.pluginManager.destroy()
    this.fileManager.removeAll()
    this._status = UploadStatus.IDLE
    this._error = null
  }
}
