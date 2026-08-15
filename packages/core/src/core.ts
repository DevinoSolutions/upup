import { UpupConfigError, UpupError, UpupErrorCode } from './errors'
import { createTranslator } from './i18n/create-translator'
import { enUS } from './i18n/locales/en-US'
import { resolveLocaleBundle } from './i18n/resolve-locale'
import type { PipelineContext } from './contracts-pipeline'
import type { UploadFile } from './types/upload-file'
import { UploadStatus } from './types/upload-status'
import { EventEmitter } from './events'
import type { CoreEvents } from './types/core-events'
import { PluginManager, type UpupPlugin, type ExtensionMethods } from './plugin'
import { FileManager } from './file-manager'
import { validateFileRestrictions } from './validate-file-restrictions'
import { PipelineEngine } from './pipeline/engine'
import { buildAutoPipeline } from './pipeline/build-auto-pipeline'
import { UploadManager } from './upload-manager'
import { resolveUploadConfig } from './resolve-upload-config'
import { abortPersistedMultipartSessions } from './strategies/multipart-upload'
import { fileFingerprint, loadSession } from './utils/multipart-session-store'
import { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
import {
    serializeCrashRecovery,
    reviveCrashRecoverySnapshot,
} from './crash-recovery-serializer'

import type {
    CoreOptions,
    ValidationResult,
    UploadOptions,
} from './options/types'
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
    /** Every crash-recovery storage write flows through this one promise chain.
     *  Blob snapshots of large files make IndexedDB puts slow; fire-and-forget
     *  save/clear calls complete out of order, so a save started before
     *  completion can land after the completion clear and resurrect a finished
     *  upload as a resumable one. FIFO ordering makes the last requested op the
     *  last applied op. */
    private crashRecoveryChain: Promise<void> = Promise.resolve()
    /** True while a snapshot sync is queued but not yet run. Progress ticks
     *  arrive far faster than a large snapshot writes; coalescing them into the
     *  one queued sync (which reads state at write time) keeps it to at most
     *  one write in flight plus one pending, instead of N stacked blob puts. */
    private crashRecoverySyncQueued = false
    private fileOverrides = new Map<string, Partial<UploadOptions>>()
    private pauseRequested = false
    private cancelRequested = false
    private destroyed = false
    private activeRun: Promise<UploadFile[]> | null = null
    private workerProvider:
        import('./worker/create-worker-provider').WorkerProvider | null = null
    options: CoreOptions

    constructor(options: CoreOptions) {
        this.options = { ...options }

        this.fileManager = new FileManager(this.fileManagerOptions())

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

    /** The one projection of CoreOptions the FileManager consumes — construction
     *  and updateOptions() must stay in lockstep, so both call this. */
    private fileManagerOptions(): import('./file-manager').FileManagerOptions {
        return {
            allowedFileTypes: this.options.allowedFileTypes,
            limit: this.options.limit,
            maxFileSize: this.options.maxFileSize,
            minFileSize: this.options.minFileSize,
            maxTotalFileSize: this.options.maxTotalFileSize,
            contentDeduplication: this.options.contentDeduplication,
            onBeforeFileAdded: this.options.onBeforeFileAdded,
        }
    }

    get files(): ReadonlyMap<string, UploadFile> {
        return this.fileManager.getFiles()
    }

    get status(): UploadStatus {
        return this._status
    }

    get error(): Error | null {
        return this._error
    }

    get progress(): {
        totalFiles: number
        completedFiles: number
        percentage: number
    } {
        const files = [...this.files.values()]
        const total = files.length
        const completed = files.filter(f => f.key != null).length
        return {
            totalFiles: total,
            completedFiles: completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        }
    }

    /**
     * Crash-recovery persistence is best-effort by design — a failed save/clear
     * must never break an upload. But full silence hides a dead durability
     * opt-in (F-734): surface failures dev-only, matching the worker-fallback
     * convention in maybeCreateWorkerProvider().
     */
    private warnCrashRecoveryFailure(op: 'save' | 'clear') {
        return (err: unknown): void => {
            if (
                typeof process !== 'undefined' &&
                process.env.NODE_ENV !== 'production'
            ) {
                console.warn(`[upup] crash-recovery ${op} failed`, err)
            }
        }
    }

    private configureCrashRecovery(
        crashRecovery: CoreOptions['crashRecovery'],
    ): void {
        if (!crashRecovery || this.crashRecovery) return

        const crashOptions =
            typeof crashRecovery === 'object' ? crashRecovery : {}
        this.crashRecovery = new CrashRecoveryManager(
            crashOptions.storage ?? new IndexedDBStorage(),
        )
        this.crashRecoveryUnsubscribe = this.on('state-change', () => {
            if (this.destroyed || this.files.size === 0) return
            this.queueCrashRecoverySync()
        })
    }

    /** Queue a snapshot write that reads files/status at WRITE time, not at
     *  event time — so the write that runs last always reflects the state that
     *  came last, and a completion observed while a save is queued turns that
     *  queued write into the clear instead of racing it. */
    private queueCrashRecoverySync(): void {
        if (this.crashRecoverySyncQueued) return
        this.crashRecoverySyncQueued = true
        void this.enqueueCrashRecoveryOp(async () => {
            this.crashRecoverySyncQueued = false
            const manager = this.crashRecovery
            if (!manager || this.destroyed || this.files.size === 0) return
            if (this._status === UploadStatus.SUCCESSFUL) {
                await manager
                    .clear()
                    .catch(this.warnCrashRecoveryFailure('clear'))
                return
            }
            await manager
                .save(serializeCrashRecovery(this.files, this._status))
                .catch(this.warnCrashRecoveryFailure('save'))
        })
    }

    /** Queue an unconditional clear behind any in-flight snapshot write. The
     *  default manager is captured at call time so a clear requested before
     *  disable/destroy still applies after the field is nulled. */
    private queueCrashRecoveryClear(
        manager: CrashRecoveryManager | null = this.crashRecovery,
    ): Promise<void> {
        if (!manager) return Promise.resolve()
        return this.enqueueCrashRecoveryOp(() => manager.clear())
    }

    private enqueueCrashRecoveryOp(op: () => Promise<void>): Promise<void> {
        const run = this.crashRecoveryChain.then(op)
        this.crashRecoveryChain = run.then(
            () => undefined,
            () => undefined,
        )
        return run
    }

    private disableCrashRecovery(): void {
        const manager = this.crashRecovery
        this.crashRecoveryUnsubscribe?.()
        this.crashRecoveryUnsubscribe = null
        this.crashRecovery = null
        this.queueCrashRecoveryClear(manager).catch(
            this.warnCrashRecoveryFailure('clear'),
        )
    }

    use(plugin: UpupPlugin): this {
        this.pluginManager.register(plugin)
        // init(emitter) is the one plugin lifecycle hook (F-607). Drive plugins
        // (Google Drive, Dropbox, OneDrive, Box) emit their events through this
        // emitter, so wiring core's bus here is what makes events like
        // 'google-drive:files-loaded' reach core.on() subscribers. Cast: core's bus
        // is EventEmitter<CoreEvents>; the plugin contract accepts the untyped bus.
        plugin.init?.(this.emitter as unknown as EventEmitter)
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

    async addFiles(
        files: File[],
        overrides?: Partial<UploadOptions>,
    ): Promise<void> {
        if (this.destroyed)
            throw new UpupError(
                'UpupCore: addFiles() after destroy()',
                UpupErrorCode.BAD_REQUEST,
            )
        try {
            const added = await this.fileManager.addFiles(files)
            if (added.length > 0) {
                if (overrides) {
                    for (const file of added) {
                        this.fileOverrides.set(file.id, overrides)
                    }
                }
                this.emitter.emit('files-added', added)
                // Continue-after-upload (F-810): once a run reached a terminal
                // status, adding fresh still-pending files must return the run
                // to IDLE so the upload CTA reappears. The already-completed
                // files keep their SUCCESSFUL status/key — the next upload()
                // only re-sends the pending ones (see runUpload).
                const wasTerminal =
                    this._status === UploadStatus.SUCCESSFUL ||
                    this._status === UploadStatus.FAILED
                if (wasTerminal && added.some(f => f.key == null)) {
                    this._status = UploadStatus.IDLE
                    this._error = null
                    this.emitter.emit('state-change', {
                        files: this.files,
                        status: this._status,
                    })
                } else {
                    this.emitter.emit('state-change', { files: this.files })
                }
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

    /**
     * Discard the persisted multipart sessions of files the user just threw
     * away (cancel / removeFile / removeAll), aborting them server-side on the
     * way out. With `resumable.persist` on, a failed or cancelled upload
     * deliberately keeps its server-side parts alive for a later resume — so
     * an explicit discard is the ONE place that has to say "no, really, drop
     * it", or the user pays storage for parts nothing will ever finish.
     *
     * Fire-and-forget and fully swallowed: cancelling must never throw or wait.
     */
    private discardPersistedMultipartSessions(files: UploadFile[]): void {
        const resumable = this.options.resumable
        if (resumable?.protocol !== 'multipart') return
        if (resumable.persist === false) return
        const pending = files.filter(file => file.key == null)
        if (pending.length === 0) return
        try {
            const { credentials } = resolveUploadConfig(this.options)
            abortPersistedMultipartSessions(pending, credentials)
        } catch {
            // upup-catch: session cleanup is advisory — a misconfigured upload
            // target must not turn cancel/remove into a throwing call.
        }
    }

    removeFile(id: string): void {
        const file = this.fileManager.removeFile(id)
        if (file) {
            this.discardPersistedMultipartSessions([file])
            this.fileOverrides.delete(id)
            this.emitter.emit('file-removed', file)
            this.emitter.emit('state-change', { files: this.files })
        }
    }

    removeAll(): void {
        this.discardPersistedMultipartSessions([...this.files.values()])
        this.fileManager.removeAll()
        this.fileOverrides.clear()
        this.queueCrashRecoveryClear().catch(
            this.warnCrashRecoveryFailure('clear'),
        )
        this.emitter.emit('state-change', { files: this.files })
        this.emitter.emit('files-cleared', {})
    }

    async setFiles(files: File[]): Promise<void> {
        if (this.destroyed)
            throw new UpupError(
                'UpupCore: setFiles() after destroy()',
                UpupErrorCode.BAD_REQUEST,
            )
        await this.fileManager.setFiles(files)
        this.emitter.emit('state-change', { files: this.files })
        this.emitter.emit('files-set', { count: this.files.size })
    }

    /** Update options after construction (e.g. when React props change). */
    updateOptions(partial: Partial<CoreOptions>): void {
        const hadCrashRecovery = this.crashRecovery != null
        const PIPELINE_FLAGS = [
            'heicConversion',
            'stripExifData',
            'imageCompression',
            'thumbnailGenerator',
            'checksumVerification',
        ] as const
        const pipelineFlagChanged = PIPELINE_FLAGS.some(k => k in partial)
        Object.assign(this.options, partial)

        this.fileManager.updateOptions(this.fileManagerOptions())

        // Invalidate the cached auto-pipeline when a flag that shapes it changes, so the next
        // upload() rebuilds from the new flags — unless an explicit pipeline was supplied
        // (that is construction-only). (F-151)
        if (pipelineFlagChanged && !this.options.pipeline) {
            this.pipelineEngine = null
        }

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

    private async maybeCreateWorkerProvider(
        stepCount: number,
    ): Promise<
        import('./worker/create-worker-provider').WorkerProvider | null
    > {
        const { isWorkerEligible } = await import('./worker/eligibility')
        if (
            !isWorkerEligible(
                this.options,
                typeof Worker !== 'undefined',
                stepCount,
            )
        )
            return null
        try {
            const [{ createWorkerProvider }, { BrowserRuntime }] =
                await Promise.all([
                    import('./worker/create-worker-provider'),
                    import('./runtime/browser'),
                ])
            return createWorkerProvider(
                BrowserRuntime,
                this.options.workerTimeoutMs !== undefined
                    ? { timeoutMs: this.options.workerTimeoutMs }
                    : {},
            )
        } catch (err) {
            // upup-catch: worker offload is optional — any failure to spin up the
            // worker falls back to the main-thread pipeline, so this is degradation,
            // not an upload error. Surface dev-only for diagnostics.
            if (
                typeof process !== 'undefined' &&
                process.env.NODE_ENV !== 'production'
            ) {
                console.warn(
                    '[upup] worker offload unavailable, falling back to main thread',
                    err,
                )
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
            onFileStart: file => {
                const uploading = this.fileManager.updateFile(file.id, {
                    status: UploadStatus.UPLOADING,
                })
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
                )
                    return
                const updated = this.fileManager.updateFile(file.id, {
                    key: result.key,
                    status: UploadStatus.SUCCESSFUL,
                })
                if (!updated) return
                this.emitter.emit('upload-success', { file: updated, result })
                this.emitter.emit('state-change', { files: this.files })
            },
            onFileError: (file, error) => {
                if (
                    this.pauseRequested ||
                    this.cancelRequested ||
                    this.destroyed
                )
                    return
                const failed = this.fileManager.updateFile(file.id, {
                    status: UploadStatus.FAILED,
                })
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
                (file.status === UploadStatus.READY ||
                    file.status === UploadStatus.UPLOADING ||
                    file.status === UploadStatus.PROCESSING ||
                    file.status === UploadStatus.PAUSED)
            ) {
                this.fileManager.updateFile(file.id, { status })
            }
        }
    }

    private markUnsuccessfulFilesFailed(): void {
        for (const file of [...this.files.values()]) {
            if (file.key == null && file.status !== UploadStatus.SUCCESSFUL) {
                this.fileManager.updateFile(file.id, {
                    status: UploadStatus.FAILED,
                })
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

    validateFiles(files: File[]): Promise<ValidationResult[]> {
        return Promise.resolve(
            files.map(file => {
                const errors = validateFileRestrictions(file, this.options)
                return { file, valid: errors.length === 0, errors }
            }),
        )
    }

    async upload(): Promise<UploadFile[]> {
        if (this.destroyed)
            throw new UpupError(
                'UpupCore: upload() after destroy()',
                UpupErrorCode.BAD_REQUEST,
            )
        if (this.activeRun) return this.activeRun
        this.activeRun = this.runUpload()
        try {
            return await this.activeRun
        } finally {
            this.activeRun = null
        }
    }

    private resetRunFlags(): void {
        this.pauseRequested = false
        this.cancelRequested = false
    }

    private async runUpload(): Promise<UploadFile[]> {
        this.resetRunFlags()
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
                const translator = createTranslator({
                    bundle: resolveLocaleBundle(this.options.locale) ?? enUS,
                    fallback: enUS,
                })
                const provider = await this.maybeCreateWorkerProvider(
                    this.pipelineEngine.stepCount,
                )
                this.workerProvider = provider
                try {
                    const context: PipelineContext = {
                        files: this.files,
                        options: this.options as Record<string, unknown>,
                        emit: (event, data) => {
                            this.emitter.emit(event, data)
                        },
                        t: (key: string, vars?: Record<string, unknown>) =>
                            translator(
                                key as Parameters<typeof translator>[0],
                                vars,
                            ),
                        worker: provider
                            ? {
                                  execute: <T>(task: {
                                      type: string
                                      data: ArrayBuffer
                                      params?: Record<string, unknown>
                                  }) => provider.execute<T>(task),
                              }
                            : undefined,
                    }
                    // Only process files that still need uploading — re-running
                    // upload() after a partial/complete run must not re-process
                    // (or below, re-PUT) files that already succeeded (F-810).
                    const processed = await this.pipelineEngine.processAll(
                        [...this.files.values()].filter(f => f.key == null),
                        context,
                    )
                    this.fileManager.applyProcessed(processed)
                } finally {
                    provider?.terminate()
                    this.workerProvider = null
                }
            }

            this._status = UploadStatus.UPLOADING
            this.emitter.emit('state-change', { status: this._status })

            // Only upload the still-pending files (those without a `key`). An
            // already-successful file keeps its key and is left untouched, so a
            // second upload() after "add more" sends only the new files (F-810).
            await this.uploadFiles(
                [...this.files.values()].filter(f => f.key == null),
            )

            this._status = UploadStatus.SUCCESSFUL
            this._error = null
            this.emitter.emit('upload-all-complete', [...this.files.values()])
            this.emitter.emit('state-change', { status: this._status })
            this.queueCrashRecoveryClear().catch(
                this.warnCrashRecoveryFailure('clear'),
            )

            return [...this.files.values()]
        } catch (error) {
            const err =
                error instanceof Error ? error : new Error(String(error))
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
            this.terminalRunFailure(err)
            throw err
        }
    }

    /**
     * The single terminal-failure path shared by all three run flavors
     * (runUpload / runRetry / resume). They previously diverged (F-729): only
     * runUpload marked leftover files FAILED, and resume never invoked
     * options.onError — a retry/resume failure looked different to consumers
     * than the identical first-run failure for no reason.
     */
    private terminalRunFailure(err: Error): void {
        this.uploadManager = null
        this._status = UploadStatus.FAILED
        this._error = err
        this.markUnsuccessfulFilesFailed()
        this.options.onError?.(err)
        this.emitter.emit('upload-error', { error: err })
        this.emitter.emit('state-change', {
            status: this._status,
            error: err,
            files: this.files,
        })
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
        if (this.destroyed)
            throw new UpupError(
                'UpupCore: resume() after destroy()',
                UpupErrorCode.BAD_REQUEST,
            )
        if (this.activeRun) return
        this.pauseRequested = false
        this._status = UploadStatus.UPLOADING
        this.emitter.emit('upload-resume', {})
        this.emitter.emit('state-change', { status: this._status })

        const incomplete = [...this.files.values()].filter(f => f.key == null)
        if (incomplete.length > 0 && this.hasUploadTarget()) {
            const run = this.uploadFiles(incomplete)
            this.activeRun = run
            run.then(() => {
                const allComplete = [...this.files.values()].every(
                    file => file.key != null,
                )
                this._status = allComplete
                    ? UploadStatus.SUCCESSFUL
                    : UploadStatus.IDLE
                this.emitter.emit('state-change', { status: this._status })
            })
                .catch((err: unknown) => {
                    if (
                        this.pauseRequested ||
                        this.cancelRequested ||
                        this.destroyed
                    )
                        return
                    this.terminalRunFailure(
                        err instanceof Error ? err : new Error(String(err)),
                    )
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
        this.discardPersistedMultipartSessions([...this.files.values()])
        this.updatePendingFileStatuses(UploadStatus.IDLE)
        this._status = UploadStatus.IDLE
        this._error = null
        this.emitter.emit('upload-cancel', {})
        this.emitter.emit('state-change', { status: this._status })
    }

    async retry(fileId?: string): Promise<UploadFile[]> {
        if (this.destroyed)
            throw new UpupError(
                'UpupCore: retry() after destroy()',
                UpupErrorCode.BAD_REQUEST,
            )
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

        const target = fileId ? this.files.get(fileId) : undefined
        const files = fileId
            ? target
                ? [target]
                : []
            : [...this.files.values()].filter(
                  file =>
                      file.key == null || file.status === UploadStatus.FAILED,
              )

        if (files.length === 0) {
            return [...this.files.values()]
        }

        this._status = UploadStatus.UPLOADING
        this._error = null
        this.emitter.emit('upload-start', { retry: true, fileId })
        this.emitter.emit('state-change', { status: this._status })

        try {
            const uploaded = await this.uploadFiles(files)
            const allComplete = [...this.files.values()].every(
                file => file.key != null,
            )
            this._status = allComplete
                ? UploadStatus.SUCCESSFUL
                : UploadStatus.IDLE
            if (allComplete) {
                this.emitter.emit('upload-all-complete', [
                    ...this.files.values(),
                ])
                this.queueCrashRecoveryClear().catch(
                    this.warnCrashRecoveryFailure('clear'),
                )
            }
            this.emitter.emit('state-change', { status: this._status })
            return uploaded
        } catch (error) {
            const err =
                error instanceof Error ? error : new Error(String(error))
            this.terminalRunFailure(err)
            throw err
        }
    }

    /**
     * Bare event names are the typed CoreEvents catalog and nothing else —
     * the untyped string overload is gone (F-723), so an unknown bare event is
     * now a compile error at the emit/subscribe site. Namespaced drive-plugin
     * events ('<provider>:<event>', e.g. 'google-drive:files-loaded') are
     * dynamic by design — plugins emit them through core's bus (see use()) —
     * and keep a template-literal passthrough.
     */
    on<K extends keyof CoreEvents>(
        event: K,
        handler: (payload: CoreEvents[K]) => void,
    ): () => void
    on(
        event: `${string}:${string}`,
        handler: (payload: unknown) => void,
    ): () => void
    on(event: string, handler: (payload: unknown) => void): () => void {
        return this.emitter.on(event, handler)
    }

    off<K extends keyof CoreEvents>(
        event: K,
        handler: (payload: CoreEvents[K]) => void,
    ): void
    off(event: `${string}:${string}`, handler: (payload: unknown) => void): void
    off(event: string, handler: (payload: unknown) => void): void {
        this.emitter.off(event, handler)
    }

    emit<K extends keyof CoreEvents>(event: K, payload: CoreEvents[K]): void
    emit(event: `${string}:${string}`, data?: unknown): void
    emit(event: string, data?: unknown): void {
        this.emitter.emit(event, data)
    }

    getSnapshot(): { files: [string, UploadFile][]; status: UploadStatus } {
        return {
            files: [...this.files.entries()],
            status: this._status,
        }
    }

    restore(snapshot: {
        files: [string, UploadFile][]
        status: UploadStatus
    }): void {
        this.fileManager.restore(snapshot.files)
        this._status = snapshot.status
        this.emitter.emit('state-change', {
            files: this.files,
            status: this._status,
        })
        this.emitter.emit('snapshot-restored', {
            count: snapshot.files.length,
            status: snapshot.status,
        })
    }

    async restoreFromCrashRecovery(): Promise<boolean> {
        if (!this.crashRecovery) return false
        const snapshot = await this.crashRecovery.restore()
        const restored = reviveCrashRecoverySnapshot(snapshot)
        if (restored && restored.files.length > 0) {
            const wasActive =
                restored.status === UploadStatus.PROCESSING ||
                restored.status === UploadStatus.UPLOADING
            const liveFiles = restored.files.filter(
                ([, file]) => !this.isStaleMultipartRestore(file),
            )
            if (liveFiles.length === 0) {
                this.queueCrashRecoveryClear().catch(
                    this.warnCrashRecoveryFailure('clear'),
                )
                return false
            }
            const normalized = {
                files: liveFiles.map(([id, file]) => {
                    if (
                        wasActive &&
                        file.key == null &&
                        (file.status === UploadStatus.PROCESSING ||
                            file.status === UploadStatus.UPLOADING ||
                            file.status === UploadStatus.READY ||
                            file.status === UploadStatus.IDLE)
                    ) {
                        return [
                            id,
                            Object.assign(file, {
                                status: UploadStatus.PAUSED,
                            }),
                        ] as [string, UploadFile]
                    }
                    return [id, file] as [string, UploadFile]
                }),
                status: wasActive ? UploadStatus.PAUSED : restored.status,
            }
            this.restore(normalized)
            this.seedRestoredProgress(normalized.files)
            this.emitter.emit('crash-recovery-restored', {})
            return true
        }
        return false
    }

    /** A restored PAUSED file rendered "0 B of N" even when most of it was
     *  already in storage — the persisted multipart session knows the real
     *  offset, but nothing replayed it into the progress pipeline until the
     *  user actually hit resume. Emit it here so the restored UI opens at the
     *  byte count the resume will continue from. Same session gates as
     *  tryResume (scope), minus the server round-trip: this is display-only
     *  and must not spend a request; the authoritative recheck still happens
     *  on resume. */
    /** A finished multipart upload can die in the window between its
     *  synchronous session removal and the asynchronous IndexedDB snapshot
     *  clear — the next visit then restores a file the server already
     *  assembled, offering a Resume that would re-upload all of it. The
     *  session store is the tiebreaker: init writes the session synchronously
     *  before the first byte moves and completion removes it synchronously,
     *  so an UPLOADING-status file of multipart size with no session is a
     *  stale snapshot, not a crashed upload. PROCESSING files never had a
     *  session and stay restorable; so does everything below the multipart
     *  threshold or outside persist mode. */
    private isStaleMultipartRestore(file: UploadFile): boolean {
        const resumable = this.options.resumable
        if (resumable?.protocol !== 'multipart') return false
        if (!(resumable.persist ?? true)) return false
        if (!(file instanceof File)) return false
        if (file.status !== UploadStatus.UPLOADING) return false
        if (file.key != null) return false
        if (file.size < (resumable.thresholdBytes ?? 5 * 1024 * 1024)) {
            return false
        }
        return loadSession(fileFingerprint(file)) == null
    }

    private seedRestoredProgress(restored: [string, UploadFile][]): void {
        for (const [, file] of restored) {
            if (file.status !== UploadStatus.PAUSED) continue
            if (!(file instanceof File)) continue
            const session = loadSession(fileFingerprint(file))
            if (!session || session.scope !== this.options.serverUrl) continue
            const loaded = Math.min(session.uploadedBytes ?? 0, file.size)
            if (loaded <= 0) continue
            this.emitter.emit('upload-progress', {
                fileId: file.id,
                loaded,
                total: file.size,
            })
        }
    }

    async clearCrashRecovery(): Promise<void> {
        await this.queueCrashRecoveryClear()
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
        // Release the manager refs (F-148). Do NOT clear crash-recovery storage — a normal
        // unmount must leave a recoverable snapshot behind. fileManager is deliberately kept
        // (not nulled) so the files/progress getters keep working post-destroy.
        this.crashRecovery = null
        this.pipelineEngine = null
        this.fileOverrides.clear()
        this.emitter.removeAllListeners()
        this.pluginManager.destroy()
        this.fileManager.removeAll()
        this._status = UploadStatus.IDLE
        this._error = null
    }
}
