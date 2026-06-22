import { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { OrchestratorCallbacks } from '../orchestrator/types'
import { ThemeStore } from '../theme/theme-store'
import { GoogleDrivePlugin } from '../adapters/google-drive-plugin'
import { DropboxPlugin } from '../adapters/dropbox-plugin'
import { BoxPlugin } from '../adapters/box-plugin'
import { OneDrivePlugin } from '../adapters/one-drive-plugin'
import { revokeFileUrl } from '../utils/file-helpers'
import type { UploadFile } from '../types/upload-file'
import type {
  CreateRootControllerParams,
  RootCallbacks,
  RootCommands,
  RootController,
  RootHostHooks,
} from './types'

export function createRootController(
  { core, options, normalized }: CreateRootControllerParams,
  hostHooks: RootHostHooks = {},
): RootController {
  const { resolved } = normalized
  const { connectSSE } = hostHooks

  const onError = (message: string) => options.onError?.(message)

  // ── Callback proxy (#3): mutable ref + getter proxy; SSE wrapper folds in connectSSE ──
  let callbackRefs: RootCallbacks = { ...options }

  const proxiedCallbacks: OrchestratorCallbacks = {
    get onError() { return callbackRefs.onError },
    get onWarn() { return callbackRefs.onWarn },
    get onUploadStart() { return callbackRefs.onUploadStart },
    get onFileUploadStart() { return callbackRefs.onFileUploadStart },
    get onFileUploadProgress() { return callbackRefs.onFileUploadProgress },
    get onFilesUploadProgress() { return callbackRefs.onFilesUploadProgress },
    get onFileUploadComplete() { return callbackRefs.onFileUploadComplete },
    get onFilesUploadComplete() {
      // SSE wrapper: invoke user callback then connectSSE per completed file
      return (files: UploadFile[]) => {
        callbackRefs.onFilesUploadComplete?.(files)
        if (connectSSE && Array.isArray(files)) files.forEach((f) => connectSSE(f))
      }
    },
    get onUploadComplete() { return callbackRefs.onUploadComplete },
    get onFilesSelected() { return callbackRefs.onFilesSelected },
    get onDoneClicked() { return callbackRefs.onDoneClicked },
    get onPrepareFiles() { return callbackRefs.onPrepareFiles },
    get onFileRemoved() {
      return (file: UploadFile) => {
        callbackRefs.onFileRemove?.(file)
        // Dedup: if onFileRemoved is the same ref as onFileRemove, skip double-call
        if (callbackRefs.onFileRemoved && callbackRefs.onFileRemoved !== callbackRefs.onFileRemove) {
          callbackRefs.onFileRemoved(file)
        }
      }
    },
    get imageEditorOptions() { return resolved.imageEditor },
    get autoUpload() { return callbackRefs.autoUpload ?? false },
  }

  // ── Orchestrator (#4) + theme ──
  const orchestrator = new UploaderOrchestrator(core, proxiedCallbacks)
  const themeConfig =
    options.theme ?? (options.dark !== undefined ? { mode: options.dark ? 'dark' : 'light' } as const : undefined)
  const theme = new ThemeStore(themeConfig)

  // ── Plugin registration (#7) ──
  const adapterPlugins: Array<{ destroy(): void }> = []
  let pluginsRegistered = false
  function registerPlugins() {
    if (pluginsRegistered) return
    pluginsRegistered = true
    const { googleDriveConfigs, dropboxConfigs, boxConfigs, oneDriveConfigs } = resolved
    if (googleDriveConfigs) {
      const p = new GoogleDrivePlugin()
      p.configure(googleDriveConfigs)
      try { core.use(p) } catch { /* already registered */ }
      adapterPlugins.push(p)
    }
    if (dropboxConfigs) {
      const p = new DropboxPlugin()
      p.configure(dropboxConfigs)
      try { core.use(p) } catch { /* already */ }
      adapterPlugins.push(p)
    }
    if (boxConfigs) {
      const p = new BoxPlugin()
      p.configure(boxConfigs)
      try { core.use(p) } catch { /* already */ }
      adapterPlugins.push(p)
    }
    if (oneDriveConfigs) {
      const p = new OneDrivePlugin()
      p.configure(oneDriveConfigs)
      try { core.use(p) } catch { /* already */ }
      adapterPlugins.push(p)
    }
  }

  // ── File input registration ──
  let inputEl: HTMLInputElement | null = null
  const registerFileInput = (el: HTMLInputElement | null) => { inputEl = el }
  const getFileInput = () => inputEl
  const openFilePicker = () => inputEl?.click()

  // ── Commands (#8/#9/#10): core-centric, vanilla-proven ──
  const filesArray = () => [...core.files.values()]

  const commands: RootCommands = {
    async handleSetSelectedFiles(newFiles: File[]) {
      try {
        await core.addFiles(newFiles)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        onError(message)
        const first = newFiles[0]
        if (first) {
          const m = message.toLowerCase()
          if (m.includes('type')) {
            callbackRefs.onFileTypeMismatch?.(first, resolved.allowedFileTypes)
            callbackRefs.onRestrictionFailed?.(first, 'TYPE_MISMATCH')
          } else if (m.includes('limit')) {
            callbackRefs.onRestrictionFailed?.(first, 'LIMIT_EXCEEDED')
          } else if (m.includes('below')) {
            callbackRefs.onRestrictionFailed?.(first, 'FILE_TOO_SMALL')
          } else if (m.includes('size')) {
            callbackRefs.onRestrictionFailed?.(first, 'FILE_TOO_LARGE')
          }
        }
      }
    },
    handleFileRemove(fileId: string) {
      const file = core.files.get(fileId)
      if (file) revokeFileUrl(file)
      core.removeFile(fileId)
    },
    handleRemoveAll() {
      core.removeAll()
    },
    async dynamicUpload(newFiles: File[] | UploadFile[]) {
      await core.setFiles(newFiles as File[])
      return core.upload()
    },
    dynamicallyReplaceFiles(newFiles: File[] | UploadFile[]) {
      filesArray().forEach((f) => revokeFileUrl(f))
      void core.setFiles(newFiles as File[])
    },
    async proceedUpload() {
      const current = filesArray()
      if (current.length === 0) return undefined
      const prepared = callbackRefs.onPrepareFiles ? await callbackRefs.onPrepareFiles(current) : current
      if (prepared !== current) await core.setFiles(prepared as File[])
      return core.upload()
    },
    async retryUpload(fileId?: string) {
      if (filesArray().length === 0) return undefined
      return core.retry(fileId)
    },
    handleCancel() {
      core.cancel()
      filesArray().forEach((f) => revokeFileUrl(f))
      core.removeAll()
      orchestrator.handleCancel()
    },
    handlePause() { core.pause() },
    handleResume() { core.resume() },
    handleDone() {
      callbackRefs.onDoneClicked?.()
      core.emit('done', {})
      commands.handleCancel()
    },
    resetState() {
      orchestrator.setIsAddingMore(false)
      core.emit('state-reset', {})
      commands.handleDone()
    },
    openImageEditor(file: UploadFile) { orchestrator.openImageEditor(file) },
    closeImageEditor() { orchestrator.closeImageEditor() },
    saveImageEdit(editedImageData: string, mimeType?: string) { orchestrator.saveImageEdit(editedImageData, mimeType) },
    replaceFile(fileId: string, newFile: UploadFile) { orchestrator.replaceFile(fileId, newFile) },
    setActiveAdapter(a) { orchestrator.setActiveAdapter(a) },
    setIsAddingMore(v: boolean) { orchestrator.setIsAddingMore(v) },
    setViewMode(m: 'grid' | 'list') { orchestrator.setViewMode(m) },
  }

  // ── Status-change dedup (#11) ──
  let lastStatus: string | undefined
  let statusUnsub: (() => void) | null = null

  // ── Subscribe fan-in ──
  const subscribers = new Set<() => void>()
  let fanInUnsubs: Array<() => void> = []

  function ensureFanIn() {
    if (fanInUnsubs.length > 0) return
    fanInUnsubs = [
      core.on('state-change', () => subscribers.forEach((l) => l())),
      orchestrator.subscribe(() => subscribers.forEach((l) => l())),
      theme.subscribe(() => subscribers.forEach((l) => l())),
    ]
  }

  function tearDownFanIn() {
    fanInUnsubs.forEach((u) => u())
    fanInUnsubs = []
  }

  // ── Lifecycle (idempotent) ──
  let initialized = false
  let disposed = false

  function init() {
    if (initialized) return
    initialized = true
    disposed = false
    orchestrator.init()
    theme.init()
    registerPlugins()
    // Status-change dedup: subscribe to orchestrator notifications
    statusUnsub = orchestrator.subscribe(() => {
      const s = orchestrator.getSnapshot().uploadStatus
      const str = String(s).toLowerCase()
      if (str !== lastStatus) {
        lastStatus = str
        callbackRefs.onStatusChange?.(str)
      }
    })
    if (options.crashRecovery) void core.restoreFromCrashRecovery().catch(() => undefined)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    initialized = false
    statusUnsub?.(); statusUnsub = null
    lastStatus = undefined
    // plugins: reset flag so they can be re-registered after re-init
    pluginsRegistered = false
    adapterPlugins.splice(0).forEach((p) => p.destroy())
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

  function updateCallbacks(next: RootCallbacks) {
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
    dispose,
  }
}
