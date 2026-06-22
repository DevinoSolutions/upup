import {
  UpupCore,
  AdapterBrowserController,
  DragDropController,
  FileSource,
  GOOGLE_DRIVE_DESCRIPTOR, ONE_DRIVE_DESCRIPTOR, DROPBOX_DESCRIPTOR, BOX_DESCRIPTOR,
  normalizeRootOptions, createRootController, createChildController,
  revokeFileUrl,
  type UploadFile,
} from '@upup/core'
import type { CreateUploaderOptions, RootContext, RootContextProps, ControllerRegistry } from './lib/types'
import { FileInputController } from './controllers/file-input'
import { CameraController } from './controllers/camera'
import { AudioRecorderController } from './controllers/audio-recorder'
import { ScreenCaptureController } from './controllers/screen-capture'

export interface BuildResult {
  ctx: RootContext
  /** Subscribe the render loop to all stores + the core state-change event. Returns an unsub-all. */
  subscribeAll(onChange: () => void): () => void
  /** Run orchestrator.init()/theme.init() + register plugins (called once after first render). */
  init(): void
  /** Tear down: unsubs, controllers, orchestrator/theme/core destroy. Idempotent. */
  dispose(): void
}

export function buildRootContext(
  options: CreateUploaderOptions,
  invalidate: () => void,
): BuildResult {
  // ── 1. Normalize + resolve ──
  const normalized = normalizeRootOptions(options)

  // ── 2. Core (vanilla owns lifecycle) ──
  const core = new UpupCore(normalized.coreOptions)

  const unsubs: Array<() => void> = []

  // ── 3. Convenience callbacks → core events (vanilla has no useUpupUpload; this is its core-event bridge) ──
  if (options.onFileAdded) unsubs.push(core.on('files-added', (...a: unknown[]) => options.onFileAdded!(...(a as [UploadFile[]]))))
  if (options.onFileRemoved) unsubs.push(core.on('file-removed', (...a: unknown[]) => options.onFileRemoved!(...(a as [UploadFile]))))
  if (options.onUploadProgress) unsubs.push(core.on('upload-progress', (...a: unknown[]) => options.onUploadProgress!(...(a as [{ fileId: string; loaded: number; total: number }]))))
  if (options.onUploadComplete) unsubs.push(core.on('upload-all-complete', (...a: unknown[]) => options.onUploadComplete!(...(a as [UploadFile[]]))))

  // ── 4. Root controller (owns orchestrator, theme, plugins, commands, crash recovery) ──
  const root = createRootController({ core, options, normalized }, { invalidate })

  // ── 5. setFiles wrapper (routes through factory command for onFilesSelected + auto-upload) ──
  async function setFiles(newFiles: File[]) {
    return root.commands.handleSetSelectedFiles(newFiles)
  }

  // ── 6. Child controllers ──
  const fileInputHandle = createChildController(
    () => new FileInputController({ getFileInput: root.getFileInput, setFiles, invalidate }),
  )

  const dragDropHandle = createChildController(
    () => new DragDropController({
      core,
      orchestrator: root.orchestrator,
      setFiles,
      // Vanilla reads its file list straight from core.files (not the orchestrator snapshot),
      // so derive the border's file count from core too.
      filesSize: () => core.files.size,
      options: () => options,
      props: () => ctx.props,
    }),
    // No onChange: DragDropController.init() subscribes ITSELF to the orchestrator (C-1 behavior).
    // Passing onChange here would double-trigger renders.
  )

  // ── 7. Camera/audio/screen/drive registry (lazy getters, unchanged from pre-refactor) ──
  let camera: CameraController | null = null
  let audio: AudioRecorderController | null = null
  let screen: ScreenCaptureController | null = null
  const driveControllers = new Map<FileSource, AdapterBrowserController>()
  const DRIVE_DESCRIPTORS: Partial<Record<FileSource, unknown>> = {
    [FileSource.GOOGLE_DRIVE]: GOOGLE_DRIVE_DESCRIPTOR,
    [FileSource.ONE_DRIVE]: ONE_DRIVE_DESCRIPTOR,
    [FileSource.DROPBOX]: DROPBOX_DESCRIPTOR,
    [FileSource.BOX]: BOX_DESCRIPTOR,
  }

  const controllers: ControllerRegistry = {
    fileInput: fileInputHandle.controller,
    dragDrop: dragDropHandle.controller,
    getCamera() { if (!camera) camera = new CameraController({ core, setFiles, setActiveAdapter, invalidate }); camera.activate(); return camera },
    getAudio() { if (!audio) audio = new AudioRecorderController({ setFiles, setActiveAdapter, invalidate }); audio.activate(); return audio },
    getScreen() { if (!screen) screen = new ScreenCaptureController({ setFiles, setActiveAdapter, invalidate }); screen.activate(); return screen },
    getDrive(source: FileSource) {
      let c = driveControllers.get(source)
      if (!c) {
        const descriptor = DRIVE_DESCRIPTORS[source] as ConstructorParameters<typeof AdapterBrowserController>[1]
        c = new AdapterBrowserController(core, descriptor, {
          onFilesSelected: (files) => { void setFiles(files) },
          onClose: () => setActiveAdapter(undefined),
        })
        c.init()
        c.subscribe(() => invalidate())
        driveControllers.set(source, c)
      }
      return c
    },
    disposeActive() {
      camera?.dispose(); camera = null
      audio?.dispose(); audio = null
      screen?.dispose(); screen = null
      driveControllers.forEach((c) => c.destroy()); driveControllers.clear()
    },
    disposeAll() { this.disposeActive(); fileInputHandle.dispose(); dragDropHandle.dispose() },
  }

  // ── 8. setActiveAdapter (vanilla-specific: disposes active adapters before delegating to factory command) ──
  function setActiveAdapter(a: FileSource | undefined) {
    controllers.disposeActive()
    root.commands.setActiveAdapter(a)
  }

  // ── 9. Vanilla-specific file-removal wrappers (KEEP: nudge dragDrop.recompute() after core-only mutations) ──
  // The factory's handleFileRemove does revokeFileUrl + core.removeFile.
  // core.removeFile bypasses the orchestrator notify, so the dropzone controller —
  // which derives absoluteHasBorder from core.files.size — would keep a stale
  // cached snapshot. Nudge it to refresh so the empty-state border returns when
  // the last file is removed (C-1 border-recovery fix; losing this reintroduces the bug).
  function handleFileRemove(fileId: string) {
    root.commands.handleFileRemove(fileId)
    dragDropHandle.controller.recompute()
  }
  function handleRemoveAll() {
    root.commands.handleRemoveAll()
    dragDropHandle.controller.recompute()
  }

  // ── 10. Props assembly (from root.resolved + vanilla-only fields) ──
  const { resolved } = root
  const props: RootContextProps = {
    mini: resolved.mini,
    sources: resolved.sources,
    allowedFileTypes: resolved.allowedFileTypes,
    limit: resolved.limit,
    maxFileSize: resolved.maxFileSize,
    multiple: resolved.multiple,
    isProcessing: options.isProcessing ?? false,
    allowPreview: options.allowPreview ?? true,
    showBranding: options.showBranding ?? true,
    disableDragDrop: options.disableDragDrop ?? false,
    className: options.className ?? '',
    folderUploadAllowDrop: resolved.folderUploadAllowDrop,
    folderPickerButtonVisible: resolved.folderPickerButtonVisible,
    imageEditor: resolved.imageEditor,
    onIntegrationClick: options.onIntegrationClick ?? (() => {}),
    resumable: resolved.resumable,
  }

  // ── 11. RootContext assembly ──
  const ctx: RootContext = {
    core,
    orchestrator: root.orchestrator,
    theme: root.theme,
    mode: resolved.mode,
    serverUrl: options.serverUrl,
    translations: resolved.translations,
    translator: resolved.translator,
    lang: resolved.lang,
    dir: resolved.dir,
    props,
    cloudDrives: {
      googleDriveConfigs: resolved.googleDriveConfigs,
      oneDriveConfigs: resolved.oneDriveConfigs,
      dropboxConfigs: resolved.dropboxConfigs,
      boxConfigs: resolved.boxConfigs,
    },
    registerFileInput: root.registerFileInput,
    getFileInput: root.getFileInput,
    openFilePicker: root.openFilePicker,
    setActiveAdapter,
    setIsAddingMore: root.commands.setIsAddingMore,
    setViewMode: root.commands.setViewMode,
    setFiles,
    handleFileRemove,
    handleRemoveAll,
    proceedUpload: () => root.commands.proceedUpload(),
    retryUpload: (fileId?: string) => root.commands.retryUpload(fileId),
    handleDone: () => root.commands.handleDone(),
    handleCancel: () => root.commands.handleCancel(),
    handlePause: () => root.commands.handlePause(),
    handleResume: () => root.commands.handleResume(),
    controllers,
    invalidate,
    onError: (message: string) => options.onError?.(message),
  }

  let disposed = false
  return {
    ctx,
    subscribeAll(onChange: () => void) {
      const subs = [root.subscribe(onChange), dragDropHandle.controller.subscribe(onChange)]
      return () => subs.forEach((u) => u())
    },
    init() {
      root.init()
      fileInputHandle.init()
      dragDropHandle.init()
    },
    dispose() {
      if (disposed) return
      disposed = true
      controllers.disposeAll()
      root.dispose()
      unsubs.forEach((u) => u())
      core.destroy()          // vanilla owns core — destroyed exactly once here
    },
  }
}
