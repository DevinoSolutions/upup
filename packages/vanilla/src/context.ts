import {
  UpupCore,
  UploaderOrchestrator,
  ThemeStore,
  AdapterBrowserController,
  DragDropController,
  FileSource,
  GoogleDrivePlugin, DropboxPlugin, BoxPlugin, OneDrivePlugin,
  GOOGLE_DRIVE_DESCRIPTOR, ONE_DRIVE_DESCRIPTOR, DROPBOX_DESCRIPTOR, BOX_DESCRIPTOR,
  createTranslator, enUS, flattenTranslatorToUiTranslations, getDir,
  normalizeSource, DEFAULT_SOURCES, DEFAULT_MAX_FILE_SIZE, resolveAccept, revokeFileUrl,
  type OrchestratorCallbacks, type LocaleBundle, type Translator, type UploadFile,
  type ResolvedImageEditorOptions,
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
  // ── Resolve props (mirrors create-root-provider) ──
  const acceptProp: string | string[] = (options.allowedFileTypes as string | string[] | undefined) ?? '*'
  const mini = options.mini ?? false
  const sources = options.sources
  const resolvedSources = sources
    ? (sources.map((s) => normalizeSource(s)).filter(Boolean) as FileSource[])
    : DEFAULT_SOURCES
  // Investigation A: svelte uses maxFiles ?? restrictions?.maxNumberOfFiles ?? 10
  // (create-root-provider.ts:110). The plan's options.limit is wrong — svelte has no `limit` prop.
  const resolvedLimit = options.maxFiles ?? options.restrictions?.maxNumberOfFiles ?? 10
  const resolvedMode = options.mode ?? (options.serverUrl && !options.uploadEndpoint ? 'server' : 'client')
  const maxFileSize = options.maxFileSize ?? options.restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  const accept = resolveAccept(
    options.restrictions?.allowedFileTypes
      ? options.restrictions.allowedFileTypes.join(',')
      : (typeof acceptProp === 'string' ? acceptProp : acceptProp.join(',')),
  )
  const limit = mini ? 1 : Math.max(resolvedLimit, 1)
  const multiple = mini ? false : limit > 1
  const folderUploadAllowDrop = options.folderUpload?.allowDrop ?? false
  const folderPickerButtonVisible = options.folderUpload?.showSelectFolderButton ?? false

  const resolvedImageEditor: ResolvedImageEditorOptions = (() => {
    const ie = (options as { imageEditor?: unknown }).imageEditor
    if (ie === true) return { enabled: true, autoOpen: 'never', display: 'inline' }
    if (typeof ie === 'object' && ie !== null) {
      const o = ie as Partial<ResolvedImageEditorOptions> & { enabled?: boolean }
      return { ...o, enabled: o.enabled ?? true, autoOpen: o.autoOpen ?? 'never', display: o.display ?? 'inline' }
    }
    return { enabled: false, autoOpen: 'never', display: 'inline' }
  })()

  const onError = (message: string) => options.onError?.(message)

  // ── Core cloud-drive mapping (mirrors create-root-provider coreCloudDrives) ──
  const coreCloudDrives = options.cloudDrives
    ? {
        googleDrive: options.cloudDrives.googleDrive,
        oneDrive: options.cloudDrives.oneDrive
          ? { clientId: options.cloudDrives.oneDrive.clientId, authority: options.cloudDrives.oneDrive.redirectUri }
          : undefined,
        dropbox: options.cloudDrives.dropbox ? { appKey: options.cloudDrives.dropbox.clientId } : undefined,
      }
    : undefined

  // ── Core (mirrors use-upup-upload) ──
  const core = new UpupCore({
    uploadEndpoint: options.uploadEndpoint || undefined,
    serverUrl: options.serverUrl,
    provider: options.provider,
    mode: resolvedMode,
    allowedFileTypes: accept,
    limit,
    maxFileSize,
    minFileSize: options.minFileSize ?? options.restrictions?.minFileSize,
    maxTotalFileSize: options.maxTotalFileSize ?? options.restrictions?.maxTotalFileSize,
    maxRetries: options.maxRetries,
    onBeforeFileAdded: options.onBeforeFileAdded,
    imageCompression: options.imageCompression,
    thumbnailGenerator: options.thumbnailGenerator,
    checksumVerification: options.checksumVerification,
    webWorker: options.webWorker,
    heicConversion: options.heicConversion,
    stripExifData: options.stripExifData,
    contentDeduplication: options.contentDeduplication,
    crashRecovery: options.crashRecovery,
    maxConcurrentUploads: options.maxConcurrentUploads,
    metadata: options.metadata,
    cors: options.cors,
    resumable: options.resumable,
    cloudDrives: coreCloudDrives,
    onError: (err) => onError(typeof err === 'string' ? err : (err as Error).message),
  } as ConstructorParameters<typeof UpupCore>[0])

  const unsubs: Array<() => void> = []

  // ── Convenience callbacks -> core events (mirrors use-upup-upload onMount) ──
  if (options.onFileAdded) unsubs.push(core.on('files-added', (...a: unknown[]) => options.onFileAdded!(...(a as [UploadFile[]]))))
  if (options.onFileRemoved) unsubs.push(core.on('file-removed', (...a: unknown[]) => options.onFileRemoved!(...(a as [UploadFile]))))
  if (options.onUploadProgress) unsubs.push(core.on('upload-progress', (...a: unknown[]) => options.onUploadProgress!(...(a as [{ fileId: string; loaded: number; total: number }]))))
  if (options.onUploadComplete) unsubs.push(core.on('upload-all-complete', (...a: unknown[]) => options.onUploadComplete!(...(a as [UploadFile[]]))))

  // ── Orchestrator (mirrors create-root-provider proxiedCallbacks subset used by vanilla) ──
  const callbacks: OrchestratorCallbacks = {
    onError,
    onUploadComplete: options.onUploadComplete,
    onFileRemoved: (file: UploadFile) => options.onFileRemoved?.(file),
    onDoneClicked: options.onDoneClicked,
    imageEditorOptions: resolvedImageEditor,
    autoUpload: (options as { autoUpload?: boolean }).autoUpload ?? false,
  }
  const orchestrator = new UploaderOrchestrator(core, callbacks)

  // ── Theme (headless ThemeStore; `theme` passthrough wins, else `dark` boolean) ──
  const themeConfig = options.theme ?? (options.dark !== undefined ? { mode: options.dark ? 'dark' : 'light' } : undefined)
  const theme = new ThemeStore(themeConfig)

  // ── i18n (mirrors create-root-provider) ──
  const i18n = options.i18n
  const localeCandidate = i18n?.locale as unknown
  const bundle = i18n?.bundle ?? (
    localeCandidate && typeof localeCandidate === 'object' && 'code' in localeCandidate && 'messages' in localeCandidate
      ? (localeCandidate as LocaleBundle)
      : undefined
  )
  const fallbackCandidate = i18n?.fallbackLocale as unknown
  const fallbackBundle =
    fallbackCandidate && typeof fallbackCandidate === 'object' && 'code' in fallbackCandidate && 'messages' in fallbackCandidate
      ? (fallbackCandidate as LocaleBundle)
      : undefined
  const translator: Translator = createTranslator({ bundle: bundle ?? enUS, fallback: fallbackBundle ?? enUS, overrides: i18n?.overrides })
  const translations = flattenTranslatorToUiTranslations(translator)
  const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
  const dir = (bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)) as 'ltr' | 'rtl'

  // ── Cloud drive configs (framework-specific, mirrors create-root-provider) ──
  const cd = options.cloudDrives
  const googleDriveConfigs = cd?.googleDrive
    ? { google_client_id: cd.googleDrive.clientId, google_api_key: cd.googleDrive.apiKey, google_app_id: cd.googleDrive.appId }
    : undefined
  const oneDriveConfigs = cd?.oneDrive ? { onedrive_client_id: cd.oneDrive.clientId, redirectUri: cd.oneDrive.redirectUri ?? '' } : undefined
  const dropboxConfigs = cd?.dropbox ? { dropbox_client_id: cd.dropbox.clientId, dropbox_redirect_uri: cd.dropbox.redirectUri ?? '' } : undefined
  const boxConfigs = cd?.box ? { box_client_id: cd.box.clientId, box_redirect_uri: cd.box.redirectUri ?? '' } : undefined

  // ── Plugin registration (mirrors create-root-provider onMount) ──
  const adapterPlugins: Array<{ destroy(): void }> = []
  function registerPlugins() {
    if (googleDriveConfigs) { const p = new GoogleDrivePlugin(); p.configure(googleDriveConfigs); try { core.use(p); adapterPlugins.push(p) } catch { /* already registered */ } }
    if (dropboxConfigs) { const p = new DropboxPlugin(); p.configure(dropboxConfigs); try { core.use(p); adapterPlugins.push(p) } catch { /* already */ } }
    if (boxConfigs) { const p = new BoxPlugin(); p.configure(boxConfigs); try { core.use(p); adapterPlugins.push(p) } catch { /* already */ } }
    if (oneDriveConfigs) { const p = new OneDrivePlugin(); p.configure(oneDriveConfigs); try { core.use(p); adapterPlugins.push(p) } catch { /* already */ } }
  }

  // ── File input registration (mirrors create-root-provider inputEl/openFilePicker) ──
  let inputEl: HTMLInputElement | null = null
  const registerFileInput = (el: HTMLInputElement | null) => { inputEl = el }
  const getFileInput = () => inputEl
  const openFilePicker = () => inputEl?.click()

  // ── File ops + upload controls (delegate to core/orchestrator, mirror svelte handlers) ──
  // Every UI source (file input, drag-drop, camera, audio, screen, url, drive, folder)
  // funnels through setFiles. It must route to core.addFiles so the orchestrator's
  // files-added auto-upload (and state-merge / onFilesSelected) fire — core.setFiles
  // emits files-set, which auto-upload does not listen for. Mirrors svelte's
  // handleSetSelectedFiles (create-root-provider.ts) and React's useRootProvider.
  // True-replace remains available to consumers via instance.core.setFiles.
  async function setFiles(newFiles: File[]) {
    try { await core.addFiles(newFiles) } catch (e) { onError(e instanceof Error ? e.message : String(e)) }
  }
  function handleFileRemove(fileId: string) {
    const file = core.files.get(fileId)
    if (file) revokeFileUrl(file)
    core.removeFile(fileId)
    // core.removeFile bypasses the orchestrator (its file-removed handler does not
    // setState), so the dropzone controller — which derives absoluteHasBorder from
    // core.files.size — would keep a stale cached snapshot. Nudge it to refresh so
    // the empty-state border returns when the last file is removed (parity with the
    // old uncached getSnapshot).
    dragDrop.recompute()
  }
  async function proceedUpload() {
    const current = [...core.files.values()]
    if (current.length === 0) return undefined
    return core.upload()
  }
  async function retryUpload(fileId?: string) {
    if ([...core.files.values()].length === 0) return undefined
    return core.retry(fileId)
  }
  function handleCancel() {
    core.cancel()
    ;[...core.files.values()].forEach((f) => revokeFileUrl(f))
    core.removeAll()
    orchestrator.handleCancel()
  }
  function handleDone() { options.onDoneClicked?.(); core.emit('done', {}); handleCancel() }

  // ── Controllers registry (lazy per-source; render loop disposes inactive on switch) ──
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

  const fileInput = new FileInputController({ getFileInput, setFiles, invalidate })
  const dragDrop = new DragDropController({
    core,
    orchestrator,
    setFiles,
    options: () => options,
    props: () => ctx.props,
  })

  const controllers: ControllerRegistry = {
    fileInput,
    dragDrop,
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
    disposeAll() { this.disposeActive(); fileInput.dispose(); dragDrop.dispose() },
  }

  // ── Actions that depend on `controllers` (dispose inactive on adapter switch) ──
  function setActiveAdapter(a: FileSource | undefined) {
    controllers.disposeActive()
    orchestrator.setActiveAdapter(a)
  }

  const props: RootContextProps = {
    mini, sources: resolvedSources, allowedFileTypes: accept, limit, maxFileSize, multiple,
    isProcessing: options.isProcessing ?? false, allowPreview: options.allowPreview ?? true,
    showBranding: options.showBranding ?? true, disableDragDrop: options.disableDragDrop ?? false,
    className: options.className ?? '', folderUploadAllowDrop, folderPickerButtonVisible,
    imageEditor: resolvedImageEditor,
    onIntegrationClick: options.onIntegrationClick ?? (() => {}),
    resumable: options.resumable,
  }

  const ctx: RootContext = {
    core, orchestrator, theme, mode: resolvedMode, serverUrl: options.serverUrl,
    translations, translator, lang, dir, props,
    cloudDrives: { googleDriveConfigs, oneDriveConfigs, dropboxConfigs, boxConfigs },
    registerFileInput, getFileInput, openFilePicker,
    setActiveAdapter,
    setIsAddingMore: (v: boolean) => orchestrator.setIsAddingMore(v),
    setViewMode: (m: 'grid' | 'list') => orchestrator.setViewMode(m),
    setFiles, handleFileRemove, proceedUpload, retryUpload, handleDone, handleCancel,
    handlePause: () => core.pause(),
    handleResume: () => core.resume(),
    controllers,
    invalidate,
    onError,
  }

  let disposed = false
  return {
    ctx,
    subscribeAll(onChange: () => void) {
      const subs: Array<() => void> = []
      subs.push(core.on('state-change', onChange))
      subs.push(orchestrator.subscribe(onChange))
      subs.push(theme.subscribe(onChange))
      subs.push(dragDrop.subscribe(onChange))
      return () => subs.forEach((u) => u())
    },
    init() {
      orchestrator.init()
      theme.init()
      dragDrop.init()
      registerPlugins()
      if (options.crashRecovery) void core.restoreFromCrashRecovery().catch(() => undefined)
    },
    dispose() {
      if (disposed) return
      disposed = true
      controllers.disposeAll()
      adapterPlugins.forEach((p) => p.destroy())
      unsubs.forEach((u) => u())
      orchestrator.destroy()
      theme.destroy()
      core.destroy()
    },
  }
}
