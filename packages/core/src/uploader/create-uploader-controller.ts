import { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { OrchestratorCallbacks } from '../orchestrator/types'
import { ThemeStore } from '../theme/theme-store'
import { GoogleDrivePlugin } from '../drives/google-drive-plugin'
import { DropboxPlugin } from '../drives/dropbox-plugin'
import { BoxPlugin } from '../drives/box-plugin'
import { OneDrivePlugin } from '../drives/one-drive-plugin'
import { revokeFileUrl } from '../utils/file-helpers'
import type { UploadFile } from '../types/upload-file'
import type {
    CreateUploaderControllerParams,
    UploaderCallbacks,
    UploaderCommands,
    UploaderController,
    UploaderHostHooks,
} from './types'

export function createUploaderController(
    { core, options, normalized }: CreateUploaderControllerParams,
    hostHooks: UploaderHostHooks = {},
): UploaderController {
    const { resolved } = normalized
    const { connectSSE } = hostHooks

    const onError = (message: string) => options.onError?.(message)

    // ── Callback proxy (#3): mutable ref + getter proxy; SSE wrapper folds in connectSSE ──
    let callbackRefs: UploaderCallbacks = { ...options }

    const proxiedCallbacks: OrchestratorCallbacks = {
        get onError() {
            return callbackRefs.onError
        },
        get onWarn() {
            return callbackRefs.onWarn
        },
        get onUploadStart() {
            return callbackRefs.onUploadStart
        },
        get onFileUploadStart() {
            return callbackRefs.onFileUploadStart
        },
        get onFileUploadProgress() {
            return callbackRefs.onFileUploadProgress
        },
        get onFilesUploadProgress() {
            return callbackRefs.onFilesUploadProgress
        },
        get onFileUploadComplete() {
            return callbackRefs.onFileUploadComplete
        },
        get onFilesUploadComplete() {
            // SSE wrapper: invoke user callback then connectSSE per completed file
            return (files: UploadFile[]) => {
                callbackRefs.onFilesUploadComplete?.(files)
                if (connectSSE && Array.isArray(files))
                    files.forEach(f => {
                        connectSSE(f)
                    })
            }
        },
        get onUploadComplete() {
            return callbackRefs.onUploadComplete
        },
        get onFilesSelected() {
            return callbackRefs.onFilesSelected
        },
        get onDoneClicked() {
            return callbackRefs.onDoneClicked
        },
        get onPrepareFiles() {
            return callbackRefs.onPrepareFiles
        },
        get onFileRemoved() {
            return callbackRefs.onFileRemoved
        },
        get imageEditorOptions() {
            return resolved.imageEditor
        },
        get autoUpload() {
            return callbackRefs.autoUpload ?? false
        },
    }

    // ── Orchestrator (#4) + theme ──
    const orchestrator = new UploaderOrchestrator(core, proxiedCallbacks)
    const themeConfig =
        options.theme ??
        (options.dark !== undefined
            ? ({ mode: options.dark ? 'dark' : 'light' } as const)
            : undefined)
    const theme = new ThemeStore(themeConfig)

    // ── Plugin registration (#7) ──
    const drivePlugins: Array<{ destroy(): void }> = []
    function registerPlugins() {
        const cd = resolved.cloudDrives
        if (cd?.googleDrive) {
            const p = new GoogleDrivePlugin()
            p.configure(cd.googleDrive)
            try {
                core.use(p)
            } catch {
                // upup-catch: core.use() throws only when this provider is already
                // registered — registration is idempotent, so ignore.
            }
            drivePlugins.push(p)
        }
        if (cd?.dropbox) {
            const p = new DropboxPlugin()
            p.configure(cd.dropbox)
            try {
                core.use(p)
            } catch {
                // upup-catch: core.use() throws only when this provider is already
                // registered — registration is idempotent, so ignore.
            }
            drivePlugins.push(p)
        }
        if (cd?.box) {
            const p = new BoxPlugin()
            p.configure(cd.box)
            try {
                core.use(p)
            } catch {
                // upup-catch: core.use() throws only when this provider is already
                // registered — registration is idempotent, so ignore.
            }
            drivePlugins.push(p)
        }
        if (cd?.oneDrive) {
            const p = new OneDrivePlugin()
            p.configure(cd.oneDrive)
            try {
                core.use(p)
            } catch {
                // upup-catch: core.use() throws only when this provider is already
                // registered — registration is idempotent, so ignore.
            }
            drivePlugins.push(p)
        }
    }

    // ── File input registration ──
    let inputEl: HTMLInputElement | null = null
    const registerFileInput = (el: HTMLInputElement | null) => {
        inputEl = el
    }
    const getFileInput = () => inputEl
    const openFilePicker = () => inputEl?.click()

    // ── Commands (#8/#9/#10): core-centric, vanilla-proven ──
    const filesArray = () => [...core.files.values()]

    const commands: UploaderCommands = {
        async handleSetSelectedFiles(newFiles: File[]) {
            try {
                await core.addFiles(newFiles)
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error)
                onError(message)
                const first = newFiles[0]
                if (first) {
                    const m = message.toLowerCase()
                    if (m.includes('type')) {
                        callbackRefs.onFileTypeMismatch?.(
                            first,
                            resolved.allowedFileTypes,
                        )
                        callbackRefs.onRestrictionFailed?.(
                            first,
                            'TYPE_MISMATCH',
                        )
                    } else if (m.includes('limit')) {
                        callbackRefs.onRestrictionFailed?.(
                            first,
                            'LIMIT_EXCEEDED',
                        )
                    } else if (m.includes('below')) {
                        callbackRefs.onRestrictionFailed?.(
                            first,
                            'FILE_TOO_SMALL',
                        )
                    } else if (m.includes('size')) {
                        callbackRefs.onRestrictionFailed?.(
                            first,
                            'FILE_TOO_LARGE',
                        )
                    }
                }
            }
        },
        // Upload-control commands are pure delegation: UploaderOrchestrator is
        // the single owner of the upload-control flow (F-722) — it holds the
        // projected state, clears uploadError/uploadErrorCode before a new
        // run, and owns the done/state-reset emissions. Re-implementing any of
        // these here re-creates the drifting second copy pass 2 removed.
        handleFileRemove(fileId: string) {
            orchestrator.removeFile(fileId)
        },
        handleRemoveAll() {
            core.removeAll()
        },
        async uploadFiles(newFiles: File[] | UploadFile[]) {
            await core.setFiles(newFiles as File[])
            return core.upload()
        },
        replaceFiles(newFiles: File[] | UploadFile[]) {
            filesArray().forEach(f => {
                revokeFileUrl(f)
            })
            void core.setFiles(newFiles as File[])
        },
        startUpload() {
            return orchestrator.startUpload()
        },
        retryUpload(fileId?: string) {
            return orchestrator.retryUpload(fileId)
        },
        handleCancel() {
            orchestrator.handleCancel()
        },
        handlePause() {
            orchestrator.handlePause()
        },
        handleResume() {
            orchestrator.handleResume()
        },
        handleDone() {
            orchestrator.handleDone()
        },
        resetState() {
            orchestrator.resetState()
        },
        openImageEditor(file: UploadFile) {
            orchestrator.openImageEditor(file)
        },
        closeImageEditor() {
            orchestrator.closeImageEditor()
        },
        saveImageEdit(editedImageData: string, mimeType?: string) {
            orchestrator.saveImageEdit(editedImageData, mimeType)
        },
        replaceFile(fileId: string, newFile: UploadFile) {
            orchestrator.replaceFile(fileId, newFile)
        },
        setActiveSource(a) {
            orchestrator.setActiveSource(a)
        },
        setIsAddingMore(v: boolean) {
            orchestrator.setIsAddingMore(v)
        },
        setViewMode(m: 'grid' | 'list') {
            orchestrator.setViewMode(m)
        },
    }

    // ── Status-change dedup (#11) ──
    let lastStatus: string | undefined
    let statusUnsub: (() => void) | null = null

    // ── Subscribe fan-in ──
    const subscribers = new Set<() => void>()
    let fanInUnsubs: Array<() => void> = []

    function ensureFanIn() {
        if (fanInUnsubs.length > 0) return
        const notifyAll = () => {
            subscribers.forEach(l => {
                l()
            })
        }
        fanInUnsubs = [
            core.on('state-change', notifyAll),
            orchestrator.subscribe(notifyAll),
            theme.subscribe(notifyAll),
        ]
    }

    function tearDownFanIn() {
        fanInUnsubs.forEach(u => {
            u()
        })
        fanInUnsubs = []
    }

    // ── Lifecycle (idempotent) ──
    let initialized = false
    let destroyed = false

    function init() {
        if (initialized) return
        initialized = true
        destroyed = false
        orchestrator.init()
        theme.init()
        registerPlugins()
        // Status-change dedup: subscribe to orchestrator notifications
        statusUnsub = orchestrator.subscribe(() => {
            const s = orchestrator.getSnapshot().uploadStatus
            const str = s.toLowerCase()
            if (str !== lastStatus) {
                lastStatus = str
                callbackRefs.onStatusChange?.(str)
            }
        })
        if (options.crashRecovery)
            void core.restoreFromCrashRecovery().catch((err: unknown) => {
                // Restore is best-effort — but silence hides a dead durability
                // opt-in (F-734): surface dev-only, like core's save/clear path.
                if (
                    typeof process !== 'undefined' &&
                    process.env.NODE_ENV !== 'production'
                ) {
                    console.warn('[upup] crash-recovery restore failed', err)
                }
            })
    }

    function destroy() {
        if (destroyed) return
        destroyed = true
        initialized = false
        statusUnsub?.()
        statusUnsub = null
        lastStatus = undefined
        drivePlugins.splice(0).forEach(p => {
            p.destroy()
        })
        tearDownFanIn()
        orchestrator.destroy()
        theme.destroy()
        // NOTE: core is owned by the host; the host destroys it
    }

    function subscribe(listener: () => void) {
        subscribers.add(listener)
        ensureFanIn()
        return () => {
            subscribers.delete(listener)
            if (subscribers.size === 0) {
                tearDownFanIn()
            }
        }
    }

    function updateCallbacks(next: UploaderCallbacks) {
        callbackRefs = { ...callbackRefs, ...next }
    }

    return {
        core,
        orchestrator,
        theme,
        resolved,
        commands,
        registerFileInput,
        getFileInput,
        openFilePicker,
        updateCallbacks,
        subscribe,
        init,
        destroy,
    }
}
