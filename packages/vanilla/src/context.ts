import {
    UpupCore,
    FileSource,
    GOOGLE_DRIVE_DESCRIPTOR,
    ONE_DRIVE_DESCRIPTOR,
    DROPBOX_DESCRIPTOR,
    BOX_DESCRIPTOR,
    type UploadFile,
    type UiTranslations,
} from '@upupjs/core'
import {
    DriveBrowserController,
    DragDropController,
    normalizeUploaderOptions,
    createUploaderController,
    createChildController,
    type CloudProvider,
} from '@upupjs/core/internal'
import { destroyTiles } from './lib/use-tiles-per-row'
import type {
    CreateUploaderOptions,
    UploaderContext,
    UploaderContextProps,
    ControllerRegistry,
} from './lib/types'
import { FileInputController } from './controllers/file-input'
import { CameraController } from './controllers/camera'
import { AudioRecorderController } from './controllers/audio-recorder'
import { ScreenCaptureController } from './controllers/screen-capture'

/** Read-only drive provider → flattened i18n label key (the human provider name
 *  for the drop-rejection toast). Mirrors React/svelte's DRIVE_SOURCE_LABEL_KEY —
 *  typed against the same drive-source union core's DragDropController gates on. */
const DRIVE_SOURCE_LABEL_KEY: Record<CloudProvider, keyof UiTranslations> = {
    googleDrive: 'googleDrive',
    oneDrive: 'oneDrive',
    dropbox: 'dropbox',
    box: 'box',
}

export interface BuildResult {
    ctx: UploaderContext
    /** Subscribe the render loop to all stores + the core state-change event. Returns an unsub-all. */
    subscribeAll(onChange: () => void): () => void
    /** Run orchestrator.init()/theme.init() + register plugins (called once after first render). */
    init(): void
    /** Tear down: unsubs, controllers, orchestrator/theme/core destroy. Idempotent. */
    destroy(): void
}

export function buildUploaderContext(
    options: CreateUploaderOptions,
    invalidate: () => void,
): BuildResult {
    // ── 1. Normalize + resolve ──
    const normalized = normalizeUploaderOptions(options)

    // ── 2. Core (vanilla owns lifecycle) ──
    const core = new UpupCore(normalized.coreOptions)

    const unsubs: Array<() => void> = []

    // ── 3. Convenience callbacks → core events (vanilla has no useUpupUpload; this is its core-event bridge) ──
    // Captured as consts so the `if` guard narrows into the event closure (options.* is mutable, so the
    // property access would not stay narrowed across the callback boundary).
    const { onFileAdded, onFileRemoved, onUploadProgress, onUploadComplete } =
        options
    if (onFileAdded)
        unsubs.push(
            core.on('files-added', (...a: unknown[]) => {
                onFileAdded(...(a as [UploadFile[]]))
            }),
        )
    if (onFileRemoved)
        unsubs.push(
            core.on('file-removed', (...a: unknown[]) => {
                onFileRemoved(...(a as [UploadFile]))
            }),
        )
    if (onUploadProgress)
        unsubs.push(
            core.on('upload-progress', (...a: unknown[]) => {
                onUploadProgress(
                    ...(a as [
                        { fileId: string; loaded: number; total: number },
                    ]),
                )
            }),
        )
    if (onUploadComplete)
        unsubs.push(
            core.on('upload-all-complete', (...a: unknown[]) => {
                onUploadComplete(...(a as [UploadFile[]]))
            }),
        )

    // ── 4. Uploader controller (owns orchestrator, theme, plugins, commands, crash recovery) ──
    const controller = createUploaderController(
        { core, options, normalized },
        { invalidate },
    )

    // ── 5. setFiles wrapper (routes through factory command for onFilesSelected + auto-upload) ──
    async function setFiles(newFiles: File[]) {
        return controller.commands.handleSetSelectedFiles(newFiles)
    }

    // ── 6. Child controllers ──
    const fileInputHandle = createChildController(
        () =>
            new FileInputController({
                getFileInput: () => controller.getFileInput(),
                setFiles,
                invalidate,
            }),
    )

    // Drop-rejection: core's DragDropController fires onReadonlyDropRejected with
    // the drive FileSource; resolve its human provider label, then raise the toast
    // (core store owns the 3s auto-clear). Function declaration so the deps closure
    // below can reference it before its textual position.
    function flagDriveDropRejected(source: FileSource) {
        const key: keyof UiTranslations | undefined =
            DRIVE_SOURCE_LABEL_KEY[source as unknown as CloudProvider]
        const label = key ? controller.resolved.translations[key] : source
        controller.transientUi.flagDropRejected(label)
    }

    const dragDropHandle = createChildController(
        () =>
            new DragDropController({
                core,
                orchestrator: controller.orchestrator,
                setFiles,
                // Vanilla reads its file list straight from core.files (not the orchestrator snapshot),
                // so derive the border's file count from core too.
                filesSize: () => core.files.size,
                options: () => options,
                props: () => ctx.props,
                onReadonlyDropRejected: source => {
                    flagDriveDropRejected(source)
                },
            }),
        // No onChange: DragDropController.init() subscribes ITSELF to the orchestrator (C-1 behavior).
        // Passing onChange here would double-trigger renders.
    )

    // ── 7. Camera/audio/screen/drive registry (lazy getters, unchanged from pre-refactor) ──
    let camera: CameraController | null = null
    let audio: AudioRecorderController | null = null
    let screen: ScreenCaptureController | null = null
    const driveControllers = new Map<FileSource, DriveBrowserController>()
    const DRIVE_DESCRIPTORS: Partial<Record<FileSource, unknown>> = {
        [FileSource.GOOGLE_DRIVE]: GOOGLE_DRIVE_DESCRIPTOR,
        [FileSource.ONE_DRIVE]: ONE_DRIVE_DESCRIPTOR,
        [FileSource.DROPBOX]: DROPBOX_DESCRIPTOR,
        [FileSource.BOX]: BOX_DESCRIPTOR,
    }

    const controllers: ControllerRegistry = {
        fileInput: fileInputHandle.controller,
        dragDrop: dragDropHandle.controller,
        getCamera() {
            if (!camera)
                camera = new CameraController({
                    core,
                    setFiles,
                    setActiveSource,
                    invalidate,
                })
            camera.activate()
            return camera
        },
        getAudio() {
            if (!audio)
                audio = new AudioRecorderController({
                    setFiles,
                    setActiveSource,
                    invalidate,
                })
            audio.activate()
            return audio
        },
        getScreen() {
            if (!screen)
                screen = new ScreenCaptureController({
                    setFiles,
                    setActiveSource,
                    invalidate,
                })
            screen.activate()
            return screen
        },
        getDrive(source: FileSource) {
            let c = driveControllers.get(source)
            if (!c) {
                const descriptor = DRIVE_DESCRIPTORS[
                    source
                ] as ConstructorParameters<typeof DriveBrowserController>[1]
                c = new DriveBrowserController(core, descriptor, {
                    onFilesSelected: files => {
                        void setFiles(files)
                    },
                    onClose: () => {
                        setActiveSource(undefined)
                    },
                })
                c.init()
                c.subscribe(() => {
                    invalidate()
                })
                driveControllers.set(source, c)
            }
            return c
        },
        destroyActive() {
            camera?.destroy()
            camera = null
            audio?.destroy()
            audio = null
            screen?.destroy()
            screen = null
            driveControllers.forEach(c => {
                c.destroy()
            })
            driveControllers.clear()
        },
        destroyAll() {
            this.destroyActive()
            fileInputHandle.destroy()
            dragDropHandle.destroy()
        },
    }

    // ── 8. setActiveSource (vanilla-specific: destroys active adapters before delegating to factory command) ──
    function setActiveSource(a: FileSource | undefined) {
        controllers.destroyActive()
        controller.commands.setActiveSource(a)
    }

    // ── 9. Vanilla-specific file-removal wrappers (KEEP: nudge dragDrop.recompute() after core-only mutations) ──
    // The factory's handleFileRemove does revokeFileUrl + core.removeFile.
    // core.removeFile bypasses the orchestrator notify, so the dropzone controller —
    // which derives absoluteHasBorder from core.files.size — would keep a stale
    // cached snapshot. Nudge it to refresh so the empty-state border returns when
    // the last file is removed (C-1 border-recovery fix; losing this reintroduces the bug).
    function handleFileRemove(fileId: string) {
        controller.commands.handleFileRemove(fileId)
        dragDropHandle.controller.recompute()
    }
    function handleRemoveAll() {
        controller.commands.handleRemoveAll()
        dragDropHandle.controller.recompute()
    }

    // ── 10. Props assembly (from controller.resolved + vanilla-only fields) ──
    const { resolved } = controller
    const props: UploaderContextProps = {
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
        quietCompletion: options.quietCompletion ?? false,
        onIntegrationClick: options.onIntegrationClick ?? (() => {}),
        resumable: resolved.resumable,
    }

    // ── 11. UploaderContext assembly ──
    const ctx: UploaderContext = {
        core,
        orchestrator: controller.orchestrator,
        theme: controller.theme,
        mode: resolved.mode,
        serverUrl: options.serverUrl,
        translations: resolved.translations,
        translator: resolved.translator,
        lang: resolved.lang,
        dir: resolved.dir,
        props,
        cloudDrives: resolved.cloudDrives,
        registerFileInput: el => {
            controller.registerFileInput(el)
        },
        getFileInput: () => controller.getFileInput(),
        openFilePicker: () => {
            controller.openFilePicker()
        },
        setActiveSource,
        setIsAddingMore: v => {
            controller.commands.setIsAddingMore(v)
        },
        setViewMode: m => {
            controller.commands.setViewMode(m)
        },
        getTransientUi: () => controller.transientUi.getSnapshot(),
        getMotionMode: () => controller.motionGate.getSnapshot(),
        openSourceOverlay: () => {
            controller.transientUi.openSourceOverlay()
        },
        closeSourceOverlay: () => {
            controller.transientUi.closeSourceOverlay()
        },
        flagDriveDropRejected,
        setFiles,
        handleFileRemove,
        handleRemoveAll,
        startUpload: () => controller.commands.startUpload(),
        retryUpload: (fileId?: string) =>
            controller.commands.retryUpload(fileId),
        handleDone: () => {
            controller.commands.handleDone()
        },
        handleCancel: () => {
            controller.commands.handleCancel()
        },
        handlePause: () => {
            controller.commands.handlePause()
        },
        handleResume: () => {
            controller.commands.handleResume()
        },
        controllers,
        invalidate,
        onError: (message: string) => options.onError?.(message),
    }

    let destroyed = false
    return {
        ctx,
        subscribeAll(onChange: () => void) {
            const subs = [
                controller.subscribe(onChange),
                dragDropHandle.controller.subscribe(onChange),
            ]
            return () => {
                subs.forEach(u => {
                    u()
                })
            }
        },
        init() {
            controller.init()
            fileInputHandle.init()
            dragDropHandle.init()
        },
        destroy() {
            if (destroyed) return
            destroyed = true
            destroyTiles(ctx)
            controllers.destroyAll()
            controller.destroy()
            unsubs.forEach(u => {
                u()
            })
            core.destroy() // vanilla owns core — destroyed exactly once here
        },
    }
}
