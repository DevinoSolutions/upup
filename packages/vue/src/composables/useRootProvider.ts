import { ref, computed, watch, onMounted, onUnmounted, defineComponent, type Ref } from 'vue'
import {
    FileSource,
    LOCALE_META,
    UploadStatus,
    createTranslator,
    enUS,
    flattenTranslatorToUiTranslations,
    flattenSlotsToClassNames,
    resolveTheme,
    DropboxPlugin,
    GoogleDrivePlugin,
    BoxPlugin,
    OneDrivePlugin,
    type FilesProgressMap,
    type LocaleBundle,
    type Translator,
    type UploadFile,
    type UpupThemeMode,
    resolveAccept,
} from '@upup/core'
import type { ResolvedImageEditorOptions } from '@upup/core'
import type { UpupUploaderProps } from '../shared/types'
import type { IRootContext } from '../context/root-context'
import { revokeFileUrl } from '@upup/core'
import {
    blobToUploadFile,
    dataURLtoBlob,
} from '../lib/image-editor-helpers'
import {
    fileFingerprint,
    loadSession,
} from '@upup/core'
import { useUpupUpload } from '../use-upup-upload'
import { useSSEProcessing } from './useSSEProcessing'

function getDir(locale: string | LocaleBundle | undefined): 'ltr' | 'rtl' {
    if (locale && typeof locale === 'object' && 'dir' in locale) return locale.dir
    const code = typeof locale === 'string' ? locale : 'en-US'
    const base = code.split('-')[0]
    const meta = LOCALE_META[code]
        ?? Object.values(LOCALE_META).find(m => m.code.startsWith(base + '-'))
    return meta?.dir ?? 'ltr'
}

function normalizeSource(source: string): FileSource | undefined {
    return (Object.values(FileSource) as string[]).includes(source)
        ? source as FileSource
        : undefined
}

const DEFAULT_SOURCES = [
    FileSource.LOCAL,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.MICROPHONE,
    FileSource.SCREEN,
]

/** Empty component placeholder for icons until Vue SVG icons are added */
const EmptyIcon = defineComponent({ render: () => null })

const EMPTY_THEME_SLOTS = {}
const EMPTY_STYLE: Record<string, string> = {}
const DEFAULT_MAX_FILE_SIZE = { size: 1, unit: 'GB' as const }

export default function useRootProvider(props: UpupUploaderProps): IRootContext {
    // ── Destructure props with defaults ──────────────────────────
    const {
        allowedFileTypes: acceptProp = '*',
        mini = false,
        theme: themeProp,
        maxFiles,
        isProcessing = false,
        allowPreview = true,
        folderUpload,
        showBranding = true,
        disableDragDrop = false,
        className,
        style,
        maxFileSize: maxFileSizeProp,
        minFileSize: minFileSizeProp,
        maxTotalFileSize: maxTotalFileSizeProp,
        restrictions,
        imageCompression = false,
        thumbnailGenerator = false,
        checksumVerification = false,
        heicConversion = false,
        stripExifData = false,
        contentDeduplication = false,
        crashRecovery = false,
        sources,
        onError: errorHandler,
        onWarn: warningHandler,
        icons = {},
        i18n,
        onIntegrationClick = () => {},
        onFileClick = () => {},
        onFileRemove: onFileRemoveProp = () => {},
        onFileRemoved: onFileRemovedProp,
        onStatusChange,
        onFilesDragOver = () => {},
        onFilesDragLeave = () => {},
        onFilesDrop = () => {},
        onFileTypeMismatch = () => {},
        onBeforeFileAdded,
        onRestrictionFailed,
        enablePaste = false,
        autoUpload = false,
        maxConcurrentUploads,
        imageEditor: imageEditorProp,
        onUploadStart = () => {},
        onFileUploadStart = () => {},
        onFileUploadProgress = () => {},
        onFilesUploadProgress = () => {},
        onFileUploadComplete = () => {},
        onFilesUploadComplete = () => {},
        onUploadComplete = () => {},
        onFilesSelected = () => {},
        onDoneClicked = () => {},
        onPrepareFiles,
        provider,
        mode: modeProp,
        uploadEndpoint,
        serverUrl,
        cloudDrives,
        metadata,
        cors,
        maxRetries,
        resumable,
        processingEndpoint,
        onFileProcessed,
        processingTimeout,
    } = props

    // ── Refs ─────────────────────────────────────────────────────
    const inputRef: Ref<HTMLInputElement | null> = ref(null)
    const isAddingMore = ref(false)
    const viewMode = ref<'grid' | 'list'>('grid')
    const isOnline = ref(true)
    const activeAdapter = ref<FileSource>()
    const filesProgressMap = ref<FilesProgressMap>({})
    const uploadError = ref('')
    const uploadSpeed = ref(0)
    const uploadEta = ref(0)
    const uploadedBytes = ref(0)
    const totalBytes = ref(0)
    const editingFile = ref<UploadFile | null>(null)
    const editorQueue = ref<UploadFile[]>([])

    // Non-reactive refs (mutable state not needing template rendering)
    let speedSamples: { time: number; bytes: number }[] = []
    let totalBytesRaw = 0
    let crashRecoveryRestored = false
    let adapterPlugins: Array<{ destroy(): void }> = []

    // ── Computed ─────────────────────────────────────────────────
    const resolvedSources = computed(() =>
        sources
            ? sources.map(source => normalizeSource(source)).filter(Boolean) as FileSource[]
            : DEFAULT_SOURCES,
    )
    const resolvedLimit = maxFiles ?? restrictions?.maxNumberOfFiles ?? 10
    const resolvedMode = modeProp ?? (serverUrl && !uploadEndpoint ? 'server' : 'client')
    const resolvedServerUrl = serverUrl
    const resolvedEndpoint = uploadEndpoint

    // Theme mode with system detection
    const requestedThemeMode = themeProp?.mode ?? 'light'
    const systemMode = ref<'light' | 'dark'>('light')

    const themeMode = computed<'light' | 'dark'>(() => {
        if (requestedThemeMode === 'system') return systemMode.value
        return requestedThemeMode
    })

    const resolvedTheme = computed(() =>
        resolveTheme({ ...(themeProp ?? {}), mode: themeMode.value }),
    )
    const themeSlots = computed(() => resolvedTheme.value.slots)
    const resolvedSlotClasses = computed(() => flattenSlotsToClassNames(themeSlots.value))

    const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
    const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
    const maxTotalFileSize = maxTotalFileSizeProp ?? restrictions?.maxTotalFileSize
    const accept = resolveAccept(
        restrictions?.allowedFileTypes ? restrictions.allowedFileTypes.join(',') : acceptProp,
    )
    const folderUploadAllowDrop = folderUpload?.allowDrop ?? false
    const folderPickerButtonVisible = folderUpload?.showSelectFolderButton ?? false
    const limit = computed(() => (mini ? 1 : Math.max(resolvedLimit, 1)))
    const multiple = computed(() => (mini ? false : limit.value > 1))

    // ── I18n ─────────────────────────────────────────────────────
    const localeCandidate = i18n?.locale as unknown
    const bundle = i18n?.bundle ?? (
        localeCandidate &&
        typeof localeCandidate === 'object' &&
        'code' in localeCandidate &&
        'messages' in localeCandidate
            ? localeCandidate as LocaleBundle
            : undefined
    )
    const fallbackCandidate = i18n?.fallbackLocale as unknown
    const fallbackBundle = (
        fallbackCandidate &&
        typeof fallbackCandidate === 'object' &&
        'code' in fallbackCandidate &&
        'messages' in fallbackCandidate
            ? fallbackCandidate as LocaleBundle
            : undefined
    )
    const translator = computed<Translator>(() =>
        createTranslator({
            bundle: bundle ?? enUS,
            fallback: fallbackBundle ?? enUS,
            overrides: i18n?.overrides,
        }),
    )
    const translations = computed(() =>
        flattenTranslatorToUiTranslations(translator.value),
    )
    const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
    const dir = bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)

    // ── Error / warn wrappers ────────────────────────────────────
    function onError(message: string) {
        uploadError.value = message
        errorHandler?.(message)
    }

    function onWarn(message: string) {
        warningHandler?.(message)
    }

    // ── Cloud drive configs ──────────────────────────────────────
    const coreCloudDrives = cloudDrives ? {
        googleDrive: cloudDrives.googleDrive,
        oneDrive: cloudDrives.oneDrive ? {
            clientId: cloudDrives.oneDrive.clientId,
            authority: cloudDrives.oneDrive.redirectUri,
        } : undefined,
        dropbox: cloudDrives.dropbox ? {
            appKey: cloudDrives.dropbox.clientId,
        } : undefined,
    } : undefined

    const oneDriveConfigs = computed(() => cloudDrives?.oneDrive ? {
        onedrive_client_id: cloudDrives.oneDrive.clientId,
        redirectUri: cloudDrives.oneDrive.redirectUri,
    } : undefined)
    const googleDriveConfigs = computed(() => cloudDrives?.googleDrive ? {
        google_client_id: cloudDrives.googleDrive.clientId,
        google_api_key: cloudDrives.googleDrive.apiKey,
        google_app_id: cloudDrives.googleDrive.appId,
    } : undefined)
    const dropboxConfigs = computed(() => cloudDrives?.dropbox ? {
        dropbox_client_id: cloudDrives.dropbox.clientId,
        dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
    } : undefined)
    const boxConfigs = computed(() => cloudDrives?.box ? {
        box_client_id: cloudDrives.box.clientId,
        box_redirect_uri: cloudDrives.box.redirectUri,
    } : undefined)

    // ── Upload core ──────────────────────────────────────────────
    const upload = useUpupUpload({
        uploadEndpoint: resolvedEndpoint || undefined,
        serverUrl: resolvedServerUrl,
        provider,
        mode: resolvedMode,
        allowedFileTypes: accept,
        limit: limit.value,
        maxFileSize,
        minFileSize,
        maxTotalFileSize,
        maxRetries,
        onBeforeFileAdded,
        imageCompression,
        thumbnailGenerator,
        checksumVerification,
        heicConversion,
        stripExifData,
        contentDeduplication,
        crashRecovery,
        maxConcurrentUploads,
        metadata,
        cors,
        resumable,
        cloudDrives: coreCloudDrives,
        onError: (err) => onError(typeof err === 'string' ? err : (err as Error).message),
    })

    const { connectSSE } = useSSEProcessing({
        processingEndpoint,
        onFileProcessed,
        onError: (err) => onError(err.message),
        processingTimeout,
    })

    const core = upload.core

    // ── Files map ────────────────────────────────────────────────
    const files = computed(() =>
        new Map((upload.files.value ?? []).map(file => [file.id, file] as const)),
    )
    const uploadStatus = computed(() => upload.status.value ?? UploadStatus.IDLE)
    const totalProgress = computed(() => upload.progress.value?.percentage ?? 0)

    // ── Image editor ─────────────────────────────────────────────
    const resolvedImageEditor = computed<ResolvedImageEditorOptions>(() => {
        if (imageEditorProp === true) {
            return { enabled: true, autoOpen: 'never', display: 'inline' }
        }
        if (typeof imageEditorProp === 'object' && imageEditorProp !== null) {
            return {
                ...imageEditorProp,
                enabled: imageEditorProp.enabled ?? true,
                autoOpen: imageEditorProp.autoOpen ?? 'never',
                display: imageEditorProp.display ?? 'inline',
            }
        }
        return { enabled: false, autoOpen: 'never', display: 'inline' }
    })

    // ── Icons (Vue Component stubs — real icons added later) ─────
    const resolvedIcons = computed(() => ({
        ContainerAddMoreIcon: icons.ContainerAddMoreIcon ?? EmptyIcon,
        FileDeleteIcon: icons.FileDeleteIcon ?? EmptyIcon,
        CameraCaptureIcon: icons.CameraCaptureIcon ?? EmptyIcon,
        CameraRotateIcon: icons.CameraRotateIcon ?? EmptyIcon,
        CameraDeleteIcon: icons.CameraDeleteIcon ?? EmptyIcon,
        LoaderIcon: icons.LoaderIcon ?? EmptyIcon,
    }))

    const resolvedStyle = style ?? EMPTY_STYLE

    // ── Functions ────────────────────────────────────────────────
    function openFilePicker() {
        inputRef.value?.click()
    }

    function setActiveAdapterFn(adapter: FileSource | undefined) {
        activeAdapter.value = adapter
    }

    function emitFileRemoved(file: UploadFile) {
        onFileRemoveProp(file)
        if (onFileRemovedProp && onFileRemovedProp !== onFileRemoveProp) {
            onFileRemovedProp(file)
        }
    }

    function openImageEditor(file: UploadFile) {
        editingFile.value = file
        resolvedImageEditor.value.onOpen?.(file)
        core?.emit('image-editor-open', { file })
    }

    function closeImageEditor() {
        const current = editingFile.value
        editingFile.value = null
        if (current) {
            resolvedImageEditor.value.onCancel?.(current)
            core?.emit('image-editor-cancel', { file: current })
        }
    }

    function replaceFile(fileId: string, newFile: UploadFile) {
        core?.replaceFile(fileId, newFile)
    }

    function saveImageEdit(editedImageData: string, mimeType?: string) {
        const current = editingFile.value
        if (!current) return
        const outputMime = mimeType || resolvedImageEditor.value.output?.mimeType || current.type
        const blob = new Blob([dataURLtoBlob(editedImageData)], { type: outputMime })
        const newFile = blobToUploadFile(blob, current, resolvedImageEditor.value.output)
        revokeFileUrl(current)
        core?.replaceFile(current.id, newFile)
        resolvedImageEditor.value.onSave?.(newFile, current)
        core?.emit('image-editor-save', { file: newFile, original: current })
        editingFile.value = null
    }

    async function handleSetSelectedFiles(newFiles: File[]) {
        try {
            await upload.addFiles(newFiles)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            onError(message)
            const first = newFiles[0]
            if (first) {
                if (message.toLowerCase().includes('type')) {
                    onFileTypeMismatch(first, accept)
                    onRestrictionFailed?.(first, 'TYPE_MISMATCH')
                } else if (message.toLowerCase().includes('limit')) {
                    onRestrictionFailed?.(first, 'LIMIT_EXCEEDED')
                } else if (message.toLowerCase().includes('below')) {
                    onRestrictionFailed?.(first, 'FILE_TOO_SMALL')
                } else if (message.toLowerCase().includes('size')) {
                    onRestrictionFailed?.(first, 'FILE_TOO_LARGE')
                }
            }
        }
    }

    async function proceedUpload() {
        const currentFiles = upload.files.value ?? []
        if (currentFiles.length === 0) return undefined
        uploadError.value = ''
        const prepared = onPrepareFiles ? await onPrepareFiles(currentFiles) : currentFiles
        if (prepared !== currentFiles) {
            await upload.setFiles(prepared as File[])
        }
        speedSamples = [{ time: Date.now(), bytes: 0 }]
        return await upload.upload()
    }

    async function retryUpload(fileId?: string) {
        if ((upload.files.value ?? []).length === 0) return undefined
        uploadError.value = ''
        speedSamples = [{ time: Date.now(), bytes: 0 }]
        return await upload.retry(fileId)
    }

    async function dynamicUpload(newFiles: File[] | UploadFile[]) {
        await upload.setFiles(newFiles as File[])
        return await upload.upload()
    }

    function dynamicallyReplaceFiles(newFiles: File[] | UploadFile[]) {
        ;(upload.files.value ?? []).forEach(file => revokeFileUrl(file))
        void upload.setFiles(newFiles as File[])
    }

    function handleFileRemove(fileId: string) {
        const file = files.value.get(fileId)
        if (file) revokeFileUrl(file)
        upload.removeFile(fileId)
    }

    function handleCancel() {
        upload.cancel()
        ;(upload.files.value ?? []).forEach(file => revokeFileUrl(file))
        upload.removeAll()
        filesProgressMap.value = {}
        uploadSpeed.value = 0
        uploadEta.value = 0
        uploadedBytes.value = 0
        totalBytes.value = 0
    }

    function handlePause() {
        upload.pause()
    }

    function handleResume() {
        speedSamples = [{ time: Date.now(), bytes: uploadedBytes.value }]
        upload.resume()
    }

    function handleDone() {
        onDoneClicked()
        core?.emit('done', {})
        handleCancel()
    }

    function resetState() {
        isAddingMore.value = false
        core?.emit('state-reset', {})
        handleDone()
    }

    // ── Lifecycle: system theme detection ────────────────────────
    onMounted(() => {
        if (requestedThemeMode !== 'system') return
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const update = () => { systemMode.value = media.matches ? 'dark' : 'light' }
        update()
        media.addEventListener?.('change', update)

        onUnmounted(() => media.removeEventListener?.('change', update))
    })

    // ── Lifecycle: crash recovery ────────────────────────────────
    onMounted(() => {
        if (!crashRecovery || crashRecoveryRestored) return
        crashRecoveryRestored = true
        void core.restoreFromCrashRecovery().catch(() => undefined)
    })

    // ── Lifecycle: online/offline ────────────────────────────────
    onMounted(() => {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            isOnline.value = navigator.onLine
        }
        const handleOnline = () => {
            isOnline.value = true
            core?.emit('connection-online', {})
        }
        const handleOffline = () => {
            isOnline.value = false
            core?.emit('connection-offline', {})
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        onUnmounted(() => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        })
    })

    // ── Lifecycle: core event subscriptions ──────────────────────
    onMounted(() => {
        if (!core) return

        const unsubs: Array<() => void> = []

        unsubs.push(core.on('upload-start', () => {
            onUploadStart()
        }))
        unsubs.push(core.on('file-upload-start', ({ file }) => {
            onFileUploadStart(file)
        }))
        unsubs.push(core.on('files-added', (added) => {
            if (!Array.isArray(added) || added.length === 0) return
            onFilesSelected(added)
            if (resolvedImageEditor.value.enabled) {
                const images = added.filter((file: UploadFile) => file.type.startsWith('image/'))
                if (resolvedImageEditor.value.autoOpen === 'single' && images.length === 1) {
                    editorQueue.value = [...editorQueue.value, images[0]]
                }
                if (resolvedImageEditor.value.autoOpen === 'always') {
                    editorQueue.value = [...editorQueue.value, ...images]
                }
            }
            if (autoUpload) {
                core.emit('auto-upload', { count: added.length })
                setTimeout(() => { void upload.upload() }, 0)
            }
        }))
        unsubs.push(core.on('file-removed', (file) => {
            emitFileRemoved(file)
        }))
        unsubs.push(core.on('upload-progress', (progress) => {
            const file = core.files.get(progress.fileId)
            filesProgressMap.value = {
                ...filesProgressMap.value,
                [progress.fileId]: {
                    id: progress.fileId,
                    loaded: progress.loaded,
                    total: progress.total,
                },
            }
            const now = Date.now()
            const nextUploaded = Object.values(filesProgressMap.value)
                .reduce((sum, item) => sum + item.loaded, 0)
            uploadedBytes.value = nextUploaded
            speedSamples.push({ time: now, bytes: nextUploaded })
            speedSamples = speedSamples.filter(sample => sample.time >= now - 3000)
            if (speedSamples.length >= 2) {
                const oldest = speedSamples[0]
                const newest = speedSamples[speedSamples.length - 1]
                const elapsed = (newest.time - oldest.time) / 1000
                if (elapsed > 0) {
                    const speed = Math.max(0, (newest.bytes - oldest.bytes) / elapsed)
                    uploadSpeed.value = speed
                    const remaining = totalBytesRaw - nextUploaded
                    uploadEta.value = speed > 0 ? Math.ceil(remaining / speed) : 0
                }
            }
            if (file) {
                onFileUploadProgress(file, {
                    loaded: progress.loaded,
                    total: progress.total,
                    percentage: progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0,
                })
            }
            onFilesUploadProgress(core.progress.completedFiles, core.progress.totalFiles)
        }))
        unsubs.push(core.on('upload-success', ({ file, result }) => {
            onFileUploadComplete(file, result?.key ?? file.key ?? '')
        }))
        unsubs.push(core.on('upload-all-complete', (completed) => {
            onFilesUploadComplete(completed)
            onUploadComplete(completed)
            completed.forEach((file: UploadFile) => connectSSE(file))
        }))
        unsubs.push(core.on('upload-error', ({ error }) => {
            onError(error.message)
        }))

        onUnmounted(() => {
            unsubs.forEach(u => u())
        })
    })

    // ── Lifecycle: adapter plugins ───────────────────────────────
    onMounted(() => {
        if (!core) return

        function registerPlugins() {
            adapterPlugins.forEach(p => p.destroy())
            adapterPlugins = []

            const plugins: Array<{ destroy(): void }> = []

            if (googleDriveConfigs.value) {
                const plugin = new GoogleDrivePlugin()
                plugin.configure(googleDriveConfigs.value)
                try { core.use(plugin) } catch { /* already registered */ }
                plugins.push(plugin)
            }
            if (dropboxConfigs.value) {
                const plugin = new DropboxPlugin()
                plugin.configure(dropboxConfigs.value)
                try { core.use(plugin) } catch { /* already registered */ }
                plugins.push(plugin)
            }
            if (boxConfigs.value) {
                const plugin = new BoxPlugin()
                plugin.configure(boxConfigs.value)
                try { core.use(plugin) } catch { /* already registered */ }
                plugins.push(plugin)
            }
            if (oneDriveConfigs.value) {
                const plugin = new OneDrivePlugin()
                plugin.configure(oneDriveConfigs.value)
                try { core.use(plugin) } catch { /* already registered */ }
                plugins.push(plugin)
            }

            adapterPlugins = plugins
        }

        registerPlugins()

        onUnmounted(() => {
            adapterPlugins.forEach(p => p.destroy())
            adapterPlugins = []
        })
    })

    // ── Watch: status changes ────────────────────────────────────
    watch(uploadStatus, (newStatus) => {
        if (newStatus) onStatusChange?.(newStatus.toLowerCase())
    })

    // ── Watch: total bytes tracking ──────────────────────────────
    watch(upload.files, (fileList) => {
        const list = fileList ?? []
        const total = list.reduce((sum, file) => sum + file.size, 0)
        totalBytes.value = total
        totalBytesRaw = total
    })

    // ── Watch: editor queue processing ───────────────────────────
    watch([editingFile, editorQueue], ([editing, queue]) => {
        if (editing || !queue || queue.length === 0) return
        const [next, ...rest] = queue
        editorQueue.value = rest
        openImageEditor(next)
    })

    // ── Watch: resumable progress pre-population ─────────────────
    watch(upload.files, (fileList) => {
        if (!resumable || resumable.protocol !== 'multipart') return
        const list = fileList ?? []
        const progressMap: FilesProgressMap = {}
        list.forEach(file => {
            const session = loadSession(fileFingerprint(file))
            if (session) {
                progressMap[file.id] = {
                    id: file.id,
                    loaded: session.uploadedBytes ?? 0,
                    total: file.size,
                }
            }
        })
        if (Object.keys(progressMap).length > 0) {
            filesProgressMap.value = progressMap
        }
    })

    // ── Return IRootContext ───────────────────────────────────────
    return {
        core,
        mode: resolvedMode,
        serverUrl: resolvedServerUrl,
        inputRef,
        openFilePicker,
        activeAdapter: activeAdapter.value,
        setActiveAdapter: setActiveAdapterFn,
        isAddingMore: isAddingMore.value,
        setIsAddingMore: (v: boolean) => { isAddingMore.value = v },
        viewMode: viewMode.value,
        setViewMode: (m: 'grid' | 'list') => { viewMode.value = m },
        isOnline: isOnline.value,
        translations: translations.value,
        translator: translator.value,
        lang,
        dir,
        theme: {
            themeMode: themeMode.value,
            isDark: themeMode.value === 'dark',
            tokens: resolvedTheme.value.tokens,
            resolved: resolvedTheme.value as typeof resolvedTheme.value & { mode: 'light' | 'dark' },
            slotOverrides: resolvedSlotClasses.value,
            slots: themeSlots.value ?? EMPTY_THEME_SLOTS,
        },
        files: files.value,
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        editingFile: editingFile.value,
        openImageEditor,
        closeImageEditor,
        saveImageEdit,
        replaceFile,
        oneDriveConfigs: oneDriveConfigs.value,
        googleDriveConfigs: googleDriveConfigs.value,
        dropboxConfigs: dropboxConfigs.value,
        boxConfigs: boxConfigs.value,
        upload: {
            totalProgress: totalProgress.value,
            filesProgressMap: filesProgressMap.value,
            proceedUpload,
            retryUpload,
            uploadStatus: uploadStatus.value,
            uploadError: uploadError.value,
            uploadSpeed: uploadSpeed.value,
            uploadEta: uploadEta.value,
            uploadedBytes: uploadedBytes.value,
            totalBytes: totalBytes.value,
        },
        props: {
            mini,
            maxRetries,
            resumable,
            onError,
            onIntegrationClick,
            onFileClick,
            onFilesDragOver,
            onFilesDragLeave,
            onFilesDrop,
            onWarn,
            enablePaste,
            sources: resolvedSources.value,
            allowedFileTypes: accept,
            maxFileSize,
            limit: limit.value,
            isProcessing,
            allowPreview,
            folderUploadAllowDrop,
            folderPickerButtonVisible,
            showBranding,
            disableDragDrop,
            className: className ?? '',
            style: resolvedStyle,
            multiple: multiple.value,
            icons: resolvedIcons.value,
            imageEditor: resolvedImageEditor.value,
        },
    }
}
