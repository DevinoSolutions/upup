'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UpupCore } from '@upup/core'
import { UploadStatus as CoreUploadStatus, createTranslator, flattenSlotsToClassNames } from '@upup/shared'
import type { Translator } from '@upup/shared'
import {
    TbCameraRotate,
    TbCapture,
    TbLoader,
    TbPlus,
    TbTrash,
} from 'react-icons/tb'
import { en_US, mergeTranslations, t } from '../shared/i18n'
import { resolveAccept } from '../shared/lib/acceptPresets'
import checkFileType from '../shared/lib/checkFileType'
import {
    FileWithParams,
    ResolvedImageEditorOptions,
    UploadAdapter,
    UpupUploaderProps,
    UpupUploaderPropsClassNames,
} from '../shared/types'
import { IRootContext, UploadStatus } from '../context/RootContext'
import {
    checkFileSize,
    compressFile,
    fileAppendParams,
    revokeFileUrl,
    sizeToBytes,
} from '../lib/file'
import {
    blobToFileWithParams,
    dataURLtoBlob,
    revokeAndReplace,
} from '../lib/imageEditorHelpers'
import {
    fileFingerprint,
    loadSession,
} from '../lib/resumable/multipartSessionStore'
import { ProviderSDK } from '../lib/storage/provider'
import { UploadResult } from '../types/StorageSDK'
import { useSSEProcessing } from './useSSEProcessing'

type FileProgress = {
    id: string
    loaded: number
    total: number
}

export type FilesProgressMap = Record<string, FileProgress>

async function uploadWithRetry(
    fn: () => Promise<UploadResult>,
    maxRetries: number,
): Promise<UploadResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            if (attempt === maxRetries) throw error
        }
    }
    throw new Error('Upload failed after retries')
}

// RTL locales - defined at module scope to avoid reallocation on every render
const RTL_LOCALES = new Set(['ar', 'ar-SA', 'he', 'he-IL', 'fa', 'fa-IR', 'ur', 'ur-PK'])

// Compute text direction based on locale language
function getDir(i18nLocale: string | object | undefined): 'ltr' | 'rtl' {
    const lang = typeof i18nLocale === 'string' ? i18nLocale : 'en-US'
    const base = lang.split('-')[0]
    return RTL_LOCALES.has(lang) || RTL_LOCALES.has(base) ? 'rtl' : 'ltr'
}

export default function useRootProvider({
    allowedFileTypes: acceptProp = '*',
    mini = false,
    theme,
    maxFiles,
    isProcessing = false,
    allowPreview = true,
    showSelectFolderButton: showSelectFolderButtonProp = false,
    allowFolderUpload = false,
    showBranding = true,
    className,
    style,
    maxFileSize: maxFileSizeProp,
    minFileSize: minFileSizeProp,
    maxTotalFileSize: maxTotalFileSizeProp,
    restrictions,
    imageCompression = false,
    thumbnailGenerator = true,
    uploadAdapters,
    sources,
    onError: errorHandler,
    onWarn: warningHandler,
    icons = {},
    i18n,
    localePack,
    translations: translationOverrides,
    onIntegrationClick = () => {},
    onFileClick = () => {},
    onFileRemove: onFileRemoveProp = () => {},
    onFileRemoved,
    onStatusChange,
    onFilesDragOver = () => {},
    onFilesDragLeave = () => {},
    onFilesDrop = () => {},
    onFileTypeMismatch = () => {},
    onBeforeFileAdded,
    onRestrictionFailed,
    enablePaste = true,
    autoUpload = false,
    maxConcurrentUploads,
    imageEditor: imageEditorProp,
    onFileUploadStart = () => {},
    onFileUploadProgress = () => {},
    onFilesUploadProgress = () => {},
    onFileUploadComplete = () => {},
    onFilesUploadComplete = () => {},
    onFilesSelected = () => {},
    onDoneClicked = () => {},
    onPrepareFiles,
    provider,
    mode = 'client',
    tokenEndpoint,
    uploadEndpoint,
    serverUrl,
    apiKey,
    cloudDrives,
    driveConfigs: driveConfigsProp,
    customProps,
    enableAutoCorsConfig = false,
    maxRetries,
    resumable,
    processingEndpoint,
    onFileProcessed,
    processingTimeout,
}: UpupUploaderProps): IRootContext {
    // ── v2 DX aliases ────────────────────────────────────────
    // sources → uploadAdapters mapping
    const sourceToAdapter: Record<string, UploadAdapter> = {
        local: UploadAdapter.INTERNAL,
        camera: UploadAdapter.CAMERA,
        url: UploadAdapter.LINK,
        google_drive: UploadAdapter.GOOGLE_DRIVE,
        onedrive: UploadAdapter.ONE_DRIVE,
        dropbox: UploadAdapter.DROPBOX,
        box: UploadAdapter.BOX,
        microphone: UploadAdapter.AUDIO,
        screen: UploadAdapter.SCREEN,
    }
    const resolvedAdapters = uploadAdapters
        ?? (sources ? sources.map(s => sourceToAdapter[s]).filter(Boolean) : [UploadAdapter.INTERNAL, UploadAdapter.LINK, UploadAdapter.CAMERA, UploadAdapter.AUDIO, UploadAdapter.SCREEN])
    const resolvedLimit = maxFiles ?? restrictions?.maxNumberOfFiles ?? 10
    // apiKey → managed service, serverUrl → self-hosted server, tokenEndpoint/uploadEndpoint → direct
    const resolvedServerUrl = serverUrl ?? (apiKey ? 'https://api.upup.dev/v1' : undefined)
    const resolvedEndpoint = tokenEndpoint ?? uploadEndpoint ?? (resolvedServerUrl ? `${resolvedServerUrl}/presign` : '')
    const dark = theme?.mode === 'dark'
    // theme.slots → per-slot className overrides passed through context
    const themeSlots = theme?.slots
    // theme.slots → internal flat className map (v1-shape) consumed by
    // components until they're migrated to read slot paths directly.
    const resolvedClassNames = flattenSlotsToClassNames(themeSlots)
    // restrictions → flat props mapping (restrictions takes precedence)
    const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize ?? { size: 1, unit: 'GB' as const } // 1 GB default
    const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
    const maxTotalFileSize = maxTotalFileSizeProp ?? restrictions?.maxTotalFileSize
    const accept = resolveAccept(restrictions?.allowedFileTypes ? restrictions.allowedFileTypes.join(',') : acceptProp)
    // allowFolderUpload → showSelectFolderButton alias
    const showSelectFolderButton = allowFolderUpload || showSelectFolderButtonProp
    // onFileRemoved → onFileRemove alias (v2 naming)
    const onFileRemove = onFileRemoved ?? onFileRemoveProp
    // cloudDrives → driveConfigs mapping (cloudDrives has cleaner keys)
    const driveConfigs = driveConfigsProp ?? (cloudDrives ? {
        googleDrive: cloudDrives.googleDrive ? {
            google_client_id: cloudDrives.googleDrive.clientId,
            google_api_key: cloudDrives.googleDrive.apiKey,
            google_app_id: cloudDrives.googleDrive.appId,
        } : undefined,
        oneDrive: cloudDrives.oneDrive ? {
            onedrive_client_id: cloudDrives.oneDrive.clientId,
            redirectUri: cloudDrives.oneDrive.redirectUri,
        } : undefined,
        dropbox: cloudDrives.dropbox ? {
            dropbox_client_id: cloudDrives.dropbox.clientId,
            dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
        } : undefined,
        box: cloudDrives.box ? {
            box_client_id: cloudDrives.box.clientId,
            box_redirect_uri: cloudDrives.box.redirectUri,
        } : undefined,
    } : undefined)

    // v2: UpupCore instance — coexists with v1 engine, available via context.core
    const coreRef = useRef<UpupCore | null>(null)
    if (typeof window !== 'undefined' && !coreRef.current) {
        coreRef.current = new UpupCore({
            uploadEndpoint: resolvedEndpoint || undefined,
            provider,
            allowedFileTypes: accept,
            limit: resolvedLimit,
            maxFileSize,
            minFileSize,
            maxTotalFileSize,
            maxRetries,
            onBeforeFileAdded,
            onError: (err) => onError(typeof err === 'string' ? err : err.message),
            autoUpload,
            imageCompression,
            maxConcurrentUploads,
            googleDriveConfigs: driveConfigs?.googleDrive as Record<string, unknown> | undefined,
            oneDriveConfigs: driveConfigs?.oneDrive as Record<string, unknown> | undefined,
            dropboxConfigs: driveConfigs?.dropbox as Record<string, unknown> | undefined,
            boxConfigs: driveConfigs?.box as Record<string, unknown> | undefined,
        })
    }

    const { connectSSE } = useSSEProcessing({ processingEndpoint, onFileProcessed, processingTimeout })

    const inputRef = useRef<HTMLInputElement>(null)
    const [isAddingMore, setIsAddingMore] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    // SSR-safe: always initialize to true so server and client first render match.
    // Next.js/Node 21+ expose `navigator` globally but `navigator.onLine` is undefined
    // (falsy), which used to give SSR=false / client=true and trigger a hydration
    // mismatch. Real browser status is synced in the online/offline effect below.
    const [isOnline, setIsOnline] = useState(true)
    const [selectedFilesMap, setSelectedFilesMap] = useState<
        Map<string, FileWithParams>
    >(new Map())
    const [activeAdapter, setActiveAdapter] = useState<UploadAdapter>()
    const [uploadStatus, setUploadStatus] = useState(UploadStatus.PENDING)
    const [filesProgressMap, setFilesProgressMap] = useState<FilesProgressMap>(
        {} as FilesProgressMap,
    )
    const [uploadError, setUploadError] = useState('')
    const [uploadSpeed, setUploadSpeed] = useState(0)
    const [uploadEta, setUploadEta] = useState(0)
    const [uploadedBytes, setUploadedBytes] = useState(0)
    const [totalBytes, setTotalBytes] = useState(0)

    // SDK ref for pause/resume control
    const sdkRef = useRef<ProviderSDK | null>(null)
    // Speed tracking refs
    const speedSamplesRef = useRef<{ time: number; bytes: number }[]>([])
    // Ref for totalBytes so progress callback always has the latest value
    const totalBytesRef = useRef(0)
    const [editingFile, setEditingFile] = useState<FileWithParams | null>(null)
    const [editorQueue, setEditorQueue] = useState<FileWithParams[]>([])

    // Keep a ref to selectedFilesMap for unmount cleanup
    const selectedFilesMapRef = useRef(selectedFilesMap)
    useEffect(() => {
        selectedFilesMapRef.current = selectedFilesMap
    }, [selectedFilesMap])

    // Revoke all blob URLs on unmount to prevent memory leaks in SPAs
    useEffect(() => {
        return () => {
            selectedFilesMapRef.current.forEach(file => revokeFileUrl(file))
        }
    }, [])

    // v2: destroy UpupCore on unmount to clean up event listeners and worker pool
    useEffect(() => {
        return () => {
            coreRef.current?.destroy()
            coreRef.current = null
        }
    }, [])

    // v2: emit 'ready' event once on mount so consumers know the uploader is initialised
    useEffect(() => {
        coreRef.current?.emit('ready', {})
    }, [])

    // v2: track browser online/offline and emit events via UpupCore (#19 Offline Queue)
    useEffect(() => {
        // Sync with the real browser status now that we are on the client. State is
        // seeded `true` for SSR safety; correct it here before attaching listeners.
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            setIsOnline(navigator.onLine)
        }
        const handleOnline = () => {
            setIsOnline(true)
            coreRef.current?.emit('connection-online', {})
        }
        const handleOffline = () => {
            setIsOnline(false)
            coreRef.current?.emit('connection-offline', {})
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // v2: sync upload status into UpupCore whenever it changes
    useEffect(() => {
        if (!coreRef.current) return
        const statusMap: Record<string, CoreUploadStatus> = {
            [UploadStatus.PENDING]: CoreUploadStatus.IDLE,
            [UploadStatus.ONGOING]: CoreUploadStatus.UPLOADING,
            [UploadStatus.PAUSED]: CoreUploadStatus.PAUSED,
            [UploadStatus.SUCCESSFUL]: CoreUploadStatus.SUCCESSFUL,
            [UploadStatus.FAILED]: CoreUploadStatus.FAILED,
        }
        const coreStatus = statusMap[uploadStatus]
        if (coreStatus) {
            coreRef.current.syncStatusFromExternal(coreStatus)
        }
    }, [uploadStatus])

    // v2: keep UpupCore options in sync when React props change
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.updateOptions({
            provider,
            serverUrl,
            apiKey,
            uploadEndpoint: resolvedEndpoint || undefined,
            allowedFileTypes: accept,
            limit: resolvedLimit,
            maxFileSize,
            minFileSize,
            maxTotalFileSize,
            maxRetries,
            onBeforeFileAdded,
            imageCompression,
            maxConcurrentUploads,
            autoUpload,
        })
    }, [provider, serverUrl, apiKey, resolvedEndpoint, accept, resolvedLimit, maxFileSize, minFileSize, maxTotalFileSize, maxRetries, onBeforeFileAdded, imageCompression, maxConcurrentUploads, autoUpload])

    // v2: emit source-change event when active adapter changes
    useEffect(() => {
        if (!coreRef.current || activeAdapter === undefined) return
        coreRef.current.emit('source-change', { source: activeAdapter })
    }, [activeAdapter])

    // v2: emit adding-more event when isAddingMore state changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('adding-more', { isAddingMore })
    }, [isAddingMore])

    // v2: emit view-mode-change event when grid/list toggle changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('view-mode-change', { viewMode })
    }, [viewMode])

    // v2: emit upload-metrics event when aggregate progress state changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('upload-metrics', {
            uploadSpeed,
            uploadEta,
            uploadedBytes,
            totalBytes,
        })
    }, [uploadSpeed, uploadEta, uploadedBytes, totalBytes])

    // v2: emit editor-queue-change event when image editor queue changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('editor-queue-change', {
            queueLength: editorQueue.length,
            queue: editorQueue,
        })
    }, [editorQueue])

    // v2: emit editing-file-change event when the active editing file changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('editing-file-change', { file: editingFile })
    }, [editingFile])

    // v2: emit upload-error-change event when uploadError message changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('upload-error-change', { error: uploadError })
    }, [uploadError])

    // v2: emit files-count-change event when selected files count changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('files-count-change', {
            count: selectedFilesMap.size,
        })
    }, [selectedFilesMap.size])

    // v2: emit progress-map-change event when per-file progress state changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('progress-map-change', { filesProgressMap })
    }, [filesProgressMap])

    // v2: emit theme-change event when dark/theme prop changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('theme-change', { dark })
    }, [dark])

    const limit = useMemo(
        () => (mini ? 1 : Math.max(resolvedLimit, 1)),
        [mini, resolvedLimit],
    )
    const multiple = useMemo(() => (mini ? false : limit > 1), [limit, mini])

    // i18n prop takes precedence over localePack/translations
    // i18n.bundle (LocaleBundle) takes precedence over i18n.locale
    const bundle = i18n?.bundle
    const i18nLocale = i18n?.locale
    const resolvedLocale = (typeof i18nLocale === 'object' ? i18nLocale : undefined) ?? localePack ?? en_US
    const resolvedOverrides = i18n?.overrides ?? translationOverrides
    const translations = useMemo(
        () => mergeTranslations(resolvedLocale, resolvedOverrides),
        [resolvedLocale, resolvedOverrides],
    )

    // ICU translator — created when i18n.bundle is provided
    const translator = useMemo<Translator | undefined>(
        () => (bundle ? createTranslator({ bundle }) : undefined),
        [bundle],
    )

    // RTL support: bundle.code/dir take precedence; fall back to i18n.locale string; default 'en-US'
    const lang = bundle?.code ?? (typeof i18nLocale === 'string' ? i18nLocale : 'en-US')
    const dir: 'ltr' | 'rtl' = bundle?.dir ?? getDir(i18nLocale)

    // v2: emit locale-change event when resolved translations change
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('locale-change', { locale: resolvedLocale, translations })
    }, [resolvedLocale, translations])

    // v2: emit limit-change event when the computed file limit changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('limit-change', { limit, multiple })
    }, [limit, multiple])

    // v2: emit adapter-change event when the active source/adapter changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('adapter-change', { adapter: activeAdapter })
    }, [activeAdapter])

    const totalProgress = useMemo(() => {
        const filesProgressMapValues = Object.values(filesProgressMap)
        if (!filesProgressMapValues.length) return 0

        const loadedValues = filesProgressMapValues.reduce(
            (a, b) => a + (b.loaded / b.total) * 100,
            0,
        )
        return Math.round(loadedValues / filesProgressMapValues.length)
    }, [filesProgressMap])

    // v2: emit total-progress-change event when aggregate upload progress changes
    useEffect(() => {
        if (!coreRef.current) return
        coreRef.current.emit('total-progress-change', { totalProgress })
    }, [totalProgress])

    const resolvedImageEditor = useMemo<ResolvedImageEditorOptions>(() => {
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
        return { enabled: true, autoOpen: 'never', display: 'inline' }
    }, [imageEditorProp])

    const openImageEditor = useCallback(
        (file: FileWithParams) => {
            setEditingFile(file)
            resolvedImageEditor.onOpen?.(file)
            coreRef.current?.emit('image-editor-open', { file })
        },
        [resolvedImageEditor],
    )

    const advanceEditorQueue = useCallback(() => {
        setEditorQueue(prev => {
            if (prev.length === 0) return prev
            const [next, ...rest] = prev
            setTimeout(() => openImageEditor(next), 0)
            return rest
        })
    }, [openImageEditor])

    const closeImageEditor = useCallback(() => {
        const current = editingFile
        setEditingFile(null)
        advanceEditorQueue()
        if (current) {
            resolvedImageEditor.onCancel?.(current)
            coreRef.current?.emit('image-editor-cancel', { file: current })
        }
    }, [editingFile, advanceEditorQueue, resolvedImageEditor])

    const saveImageEdit = useCallback(
        (editedImageData: string, mimeType?: string) => {
            if (!editingFile) return

            const original = editingFile
            const outputMime =
                mimeType ||
                resolvedImageEditor.output?.mimeType ||
                original.type
            const quality = resolvedImageEditor.output?.quality

            // Convert the base64 / dataURL to a Blob.
            // If a quality or mimeType override is specified and the data is a
            // plain dataURL, we re-encode via canvas; otherwise use as-is.
            let blob: Blob
            if (
                (quality !== undefined || outputMime !== original.type) &&
                editedImageData.startsWith('data:')
            ) {
                // Fast path: just decode the dataURL directly with the given mime.
                const raw = dataURLtoBlob(editedImageData)
                blob = new Blob([raw], { type: outputMime })
            } else {
                blob = dataURLtoBlob(editedImageData)
            }

            const newFile = blobToFileWithParams(
                blob,
                original,
                resolvedImageEditor.output,
            )

            // Replace in the files map, revoking the old blob URL.
            setSelectedFilesMap(prev => {
                const updated = revokeAndReplace(prev, original.id, newFile)
                // v2: sync updated file state into UpupCore
                coreRef.current?.syncFilesFromExternal(updated as Map<string, any>)
                return updated
            })

            resolvedImageEditor.onSave?.(newFile, original)
            coreRef.current?.emit('image-editor-save', { file: newFile, original })

            setEditingFile(null)
            advanceEditorQueue()
        },
        [editingFile, resolvedImageEditor, advanceEditorQueue],
    )

    const replaceFile = useCallback(
        (fileId: string, newFile: FileWithParams) => {
            setSelectedFilesMap(prev => {
                const next = new Map(prev)
                next.set(fileId, newFile)
                // v2: sync into UpupCore
                coreRef.current?.syncFilesFromExternal(next as Map<string, any>)
                return next
            })
            // v2: emit file-replaced event so consumers can react to programmatic file swaps
            coreRef.current?.emit('file-replaced', { fileId, newFile })
        },
        [],
    )

    // Auto-open editor queue processing: when a queue is populated and no
    // editor is currently open, open the next file.
    useEffect(() => {
        if (editingFile || editorQueue.length === 0) return
        const [next, ...rest] = editorQueue
        setEditorQueue(rest)
        openImageEditor(next)
    }, [editingFile, editorQueue, openImageEditor])

    const onError = useCallback(
        (message: string) => {
            setUploadError(message)

            if (errorHandler) errorHandler(message)
        },
        [errorHandler],
    )

    const onWarn = useCallback(
        (message: string) => {
            if (warningHandler) warningHandler(message)
            // v2: emit warn event via UpupCore so consumers can listen
            coreRef.current?.emit('warn', { message })
        },
        [warningHandler],
    )
    function isFileWithParamsArray(
        files: File[] | FileWithParams[],
    ): files is FileWithParams[] {
        return files.length > 0 && 'id' in files[0]
    }
    async function resetState() {
        setIsAddingMore(false)
        // v2: emit state-reset before the done/cancel chain clears state
        coreRef.current?.emit('state-reset', {})
        handleDone()
    }
    async function dynamicUpload(files: File[] | FileWithParams[]) {
        const filesToUpload = isFileWithParamsArray(files)
            ? files
            : files.map(file => fileAppendParams(file))
        return await proceedUpload(filesToUpload)
    }
    function dynamicallyReplaceFiles(files: File[] | FileWithParams[]) {
        // Revoke old blob URLs to prevent memory leak
        selectedFilesMap.forEach(file => revokeFileUrl(file))

        const filesMap = new Map<string, FileWithParams>()
        if (isFileWithParamsArray(files)) {
            for (const f of files) {
                filesMap.set(f.id, f)
            }
        } else {
            for (const f of files) {
                const fileWithParams = fileAppendParams(f)
                filesMap.set(fileWithParams.id, fileWithParams)
            }
        }
        setSelectedFilesMap(filesMap)

        // v2: sync replaced files into UpupCore and emit event
        if (coreRef.current) {
            coreRef.current.syncFilesFromExternal(filesMap as Map<string, any>)
            coreRef.current.emit('files-replaced', { count: filesMap.size })
        }
    }
    const handleSetSelectedFiles = async (newFiles: File[]) => {
        // Start from existing files to ensure appending behavior.
        const newFilesMap = new Map(selectedFilesMap)
        // Track existing URLs (when present) to avoid duplicates across drops.
        const existingUrls = new Set(
            Array.from(newFilesMap.values())
                .map(v => (v as any).url)
                .filter(Boolean),
        ) as Set<string>

        // Collect only the files that are actually accepted and added in this batch.
        const addedThisBatch: FileWithParams[] = []

        for (const incoming of newFiles) {
            // Respect the limit strictly; stop when capacity is reached.
            if (newFilesMap.size >= limit) {
                onWarn(translations.allowedLimitSurpassed)
                onRestrictionFailed?.(incoming, 'LIMIT_EXCEEDED')
                coreRef.current?.emit('restriction-failed', { file: incoming, reason: 'LIMIT_EXCEEDED' })
                break
            }

            // v2: async file filter. Contract:
            //   false          → skip this file
            //   File           → use the returned File in place of the original
            //                    (lets consumers rename, transcode, watermark, etc.)
            //   undefined/true → accept the original file
            let file: File = incoming
            if (onBeforeFileAdded) {
                const result = await onBeforeFileAdded(file)
                if (result === false) continue
                if (result instanceof File) file = result
            }

            const fileWithParams = fileAppendParams(file)

            if (!checkFileType(accept, file)) {
                onError(
                    t(translations.fileUnsupportedType, { name: file.name }),
                )
                onFileTypeMismatch(file, accept)
                onRestrictionFailed?.(file, 'TYPE_MISMATCH')
                coreRef.current?.emit('restriction-failed', { file, reason: 'TYPE_MISMATCH' })
                revokeFileUrl(fileWithParams)
                continue
            }

            if (
                maxFileSize?.size &&
                maxFileSize?.unit &&
                !checkFileSize(file, maxFileSize)
            ) {
                onError(
                    t(translations.fileTooLargeName, {
                        name: file.name,
                        size: String(maxFileSize.size),
                        unit: String(maxFileSize.unit),
                    }),
                )
                onRestrictionFailed?.(file, 'FILE_TOO_LARGE')
                coreRef.current?.emit('restriction-failed', { file, reason: 'FILE_TOO_LARGE' })
                revokeFileUrl(fileWithParams)
                continue
            }

            // v2: min file size check
            if (
                minFileSize?.size &&
                minFileSize?.unit &&
                !checkFileSize(file, minFileSize, 'min')
            ) {
                onError(
                    t(translations.fileTooSmallName, {
                        name: file.name,
                        size: String(minFileSize.size),
                        unit: String(minFileSize.unit),
                    }),
                )
                onRestrictionFailed?.(file, 'FILE_TOO_SMALL')
                coreRef.current?.emit('restriction-failed', { file, reason: 'FILE_TOO_SMALL' })
                revokeFileUrl(fileWithParams)
                continue
            }

            if (newFilesMap.has(fileWithParams.id)) {
                onWarn(
                    t(translations.filePreviouslySelected, { name: file.name }),
                )
                // v2: emit restriction-failed for duplicate file
                coreRef.current?.emit('restriction-failed', { file, reason: 'DUPLICATE' })
                revokeFileUrl(fileWithParams)
                continue
            }

            const fileUrl = (file as any).url as string | undefined
            if (fileUrl && existingUrls.has(fileUrl)) {
                onWarn(
                    t(translations.fileWithUrlPreviouslySelected, {
                        url: fileUrl,
                    }),
                )
                // v2: emit restriction-failed for duplicate URL
                coreRef.current?.emit('restriction-failed', { file, reason: 'DUPLICATE' })
                revokeFileUrl(fileWithParams)
                continue
            }

            newFilesMap.set(fileWithParams.id, fileWithParams)
            addedThisBatch.push(fileWithParams)
            if (fileUrl) existingUrls.add(fileUrl)
        }

        // Apply state update once for better performance and atomicity.
        setSelectedFilesMap(newFilesMap)

        // v2: sync file state into UpupCore's FileManager
        if (coreRef.current) {
            coreRef.current.syncFilesFromExternal(newFilesMap as Map<string, any>)
        }

        // Emit a single selection event for just-added files.
        if (addedThisBatch.length) onFilesSelected(addedThisBatch)

        // v2: bridge to UpupCore event system
        if (addedThisBatch.length && coreRef.current) {
            coreRef.current.emit('files-added', addedThisBatch)
        }

        // v2: auto-upload immediately after file selection
        if (autoUpload && addedThisBatch.length) {
            // v2: emit event so consumers know upload was triggered automatically
            coreRef.current?.emit('auto-upload', { count: addedThisBatch.length })
            // Delay slightly to ensure state is committed before upload
            setTimeout(() => {
                proceedUpload(Array.from(newFilesMap.values()))
            }, 0)
        }

        // Auto-open image editor for newly added images if configured.
        if (resolvedImageEditor.enabled && addedThisBatch.length) {
            const newImages = addedThisBatch.filter(f =>
                f.type.startsWith('image/'),
            )

            if (newImages.length > 0) {
                if (
                    resolvedImageEditor.autoOpen === 'single' &&
                    newImages.length === 1
                ) {
                    openImageEditor(newImages[0])
                } else if (resolvedImageEditor.autoOpen === 'always') {
                    // Queue all: first one opens immediately, rest are queued.
                    const [first, ...rest] = newImages
                    openImageEditor(first)
                    if (rest.length) {
                        setEditorQueue(prev => [...prev, ...rest])
                    }
                }
            }
        }

        setIsAddingMore(false)
    }

    const handleFileRemove = useCallback(
        (fileId: string) => {
            const file = selectedFilesMap.get(fileId)
            if (!file) return

            // Revoke blob URL to prevent memory leak
            revokeFileUrl(file)

            const selectedFilesMapCopy = new Map(selectedFilesMap)
            selectedFilesMapCopy.delete(fileId)

            setSelectedFilesMap(selectedFilesMapCopy)

            // v2: sync file state into UpupCore's FileManager
            if (coreRef.current) {
                coreRef.current.syncFilesFromExternal(selectedFilesMapCopy as Map<string, any>)
            }

            onFileRemove(file)

            // v2: bridge to UpupCore event system
            if (coreRef.current) {
                coreRef.current.emit('file-removed', file)
            }
        },
        [onFileRemove, selectedFilesMap],
    )

    const compressFiles = useCallback(
        async (files: FileWithParams[]) => {
            try {
                return await Promise.all(
                    files.map(async oldFile => {
                        return await compressFile(oldFile)
                    }),
                )
            } catch (error) {
                files.forEach(file =>
                    onError(
                        t(translations.errorCompressingFile, {
                            name: file.name,
                        }),
                    ),
                )
                // v2: emit compression error via UpupCore
                coreRef.current?.emit('compression-error', { error, fileCount: files.length })
                throw error
            }
        },
        [onError],
    )

    const handlePrepareFiles = useCallback(
        async (files: FileWithParams[]) => {
            // Pre-populate progress from existing multipart sessions
            const progressMap = files.reduce((a, b) => {
                let initialLoaded = 0
                if (resumable?.mode === 'multipart') {
                    const fp = fileFingerprint(b)
                    const session = loadSession(fp)
                    if (session?.uploadedBytes) {
                        initialLoaded = session.uploadedBytes
                    }
                }
                a[b.id] = {
                    id: b.id,
                    loaded: initialLoaded,
                    total: b.size,
                }
                return a
            }, {} as FilesProgressMap)
            setFilesProgressMap(progressMap)

            // Set total bytes for ETA calculation
            const total = files.reduce((sum, f) => sum + f.size, 0)
            setTotalBytes(total)
            totalBytesRef.current = total
            const initialUploaded = Object.values(progressMap).reduce(
                (sum: number, fp: FileProgress) => sum + fp.loaded,
                0,
            )
            setUploadedBytes(initialUploaded)
            setUploadSpeed(0)
            setUploadEta(0)
            speedSamplesRef.current = []

            const prepared = onPrepareFiles ? await onPrepareFiles(files) : files
            // v2: emit prepare-files event so consumers can observe the prepared file list
            if (onPrepareFiles) {
                coreRef.current?.emit('prepare-files', { count: prepared.length })
            }
            return prepared
        },
        [onPrepareFiles, resumable],
    )
    const proceedUpload = useCallback(
        async (dynamicFiles: FileWithParams[] | undefined = undefined) => {
            if (!selectedFilesMap.size && !dynamicFiles) return
            setUploadStatus(UploadStatus.ONGOING)
            setUploadError('')

            // v2: bridge to UpupCore event system
            if (coreRef.current) {
                coreRef.current.emit('upload-start', {})
            }

            const sendEvent = !dynamicFiles
            const selectedFiles = dynamicFiles
                ? dynamicFiles
                : Array.from(selectedFilesMap.values())
            try {
                const compressedFiles = imageCompression
                    ? await compressFiles(selectedFiles)
                    : selectedFiles
                const processedFiles = await handlePrepareFiles(compressedFiles)
                // Initialize SDK
                const sdk = new ProviderSDK({
                    provider,
                    tokenEndpoint: resolvedEndpoint,
                    constraints: {
                        multiple,
                        accept: accept,
                        maxFileSize:
                            maxFileSize?.size && maxFileSize?.unit
                                ? sizeToBytes(
                                      maxFileSize.size,
                                      maxFileSize.unit,
                                  )
                                : undefined,
                    },
                    customProps,
                    enableAutoCorsConfig,
                    resumable,
                    translations: translations,
                })

                // Store SDK ref for pause/resume
                sdkRef.current = sdk
                speedSamplesRef.current = [{ time: Date.now(), bytes: 0 }]

                // For multipart resumable uploads, filter out already-uploaded files on retry
                const filesToUpload =
                    resumable?.mode === 'multipart'
                        ? processedFiles.filter(f => !f.key)
                        : processedFiles

                // Upload files with automatic retries if configured
                const uploadOptions = {
                    onFileUploadStart: (...args: Parameters<typeof onFileUploadStart>) => {
                        onFileUploadStart(...args)

                        // v2: bridge per-file start to UpupCore
                        if (coreRef.current) {
                            coreRef.current.emit('file-upload-start', { file: args[0] })
                        }
                    },
                    onFileUploadProgress: (
                        file: FileWithParams,
                        progress: {
                            loaded: number
                            total: number
                            percentage: number
                        },
                    ) => {
                        // Skip visual updates while paused so the UI freezes immediately
                        if (sdkRef.current?.isPaused) return

                        setFilesProgressMap((prev: FilesProgressMap) => ({
                            ...prev,
                            [file.id]: {
                                ...prev[file.id],
                                loaded: progress.loaded,
                            },
                        }))

                        // Update aggregate uploaded bytes for speed/ETA
                        setFilesProgressMap((prev: FilesProgressMap) => {
                            const totalLoaded = Object.values(prev).reduce(
                                (sum: number, fp: FileProgress) =>
                                    sum + fp.loaded,
                                0,
                            )
                            setUploadedBytes(totalLoaded)

                            // Rolling-average speed calculation (last 3 seconds)
                            const now = Date.now()
                            speedSamplesRef.current.push({
                                time: now,
                                bytes: totalLoaded,
                            })
                            // Keep only samples from last 3 seconds
                            const cutoff = now - 3000
                            speedSamplesRef.current =
                                speedSamplesRef.current.filter(
                                    (s: { time: number; bytes: number }) =>
                                        s.time >= cutoff,
                                )

                            if (speedSamplesRef.current.length >= 2) {
                                const oldest = speedSamplesRef.current[0]
                                const newest =
                                    speedSamplesRef.current[
                                        speedSamplesRef.current.length - 1
                                    ]
                                const elapsed =
                                    (newest.time - oldest.time) / 1000
                                if (elapsed > 0) {
                                    const speed =
                                        (newest.bytes - oldest.bytes) / elapsed
                                    setUploadSpeed(Math.max(0, speed))

                                    const remaining =
                                        totalBytesRef.current - totalLoaded
                                    if (speed > 0) {
                                        setUploadEta(
                                            Math.ceil(remaining / speed),
                                        )
                                    }
                                }
                            }

                            return prev
                        })

                        onFileUploadProgress(file, progress)

                        // v2: bridge progress to UpupCore event system
                        if (coreRef.current) {
                            coreRef.current.emit('upload-progress', {
                                fileId: file.id,
                                loaded: progress.loaded,
                                total: progress.total,
                            })
                        }
                    },
                    onFileUploadComplete: (...args: Parameters<typeof onFileUploadComplete>) => {
                        onFileUploadComplete(...args)

                        // v2: bridge per-file completion to UpupCore
                        if (coreRef.current) {
                            coreRef.current.emit('upload-success', { file: args[0] })
                        }
                    },
                    sendEvent,
                    onError,
                    onFilesUploadProgress: (completedFiles: number) =>
                        onFilesUploadProgress(
                            completedFiles,
                            processedFiles.length,
                        ),
                }
                const uploadResults = await Promise.all(
                    filesToUpload.map(file =>
                        maxRetries
                            ? uploadWithRetry(
                                  () => sdk.upload(file, uploadOptions),
                                  maxRetries,
                              )
                            : sdk.upload(file, uploadOptions),
                    ),
                )
                const finalFiles = uploadResults.map((result: any) => result.file)
                if (sendEvent) onFilesUploadComplete(finalFiles)

                // v2: SSE processing — open a server-sent event connection per file
                // if `processingEndpoint` is configured (e.g. for post-upload transcoding)
                finalFiles.forEach(connectSSE)

                // v2: bridge to UpupCore event system
                if (coreRef.current) {
                    coreRef.current.emit('upload-all-complete', finalFiles)
                }

                sdkRef.current = null
                setUploadStatus(UploadStatus.SUCCESSFUL)
                return finalFiles
            } catch (error) {
                onError((error as Error).message)

                // v2: bridge to UpupCore event system
                if (coreRef.current) {
                    coreRef.current.emit('upload-error', { error })
                }

                sdkRef.current = null
                setUploadStatus(UploadStatus.FAILED)
                // Preserve filesProgressMap so progress stays visible alongside the Retry button
                return
            }
        },
        [
            selectedFilesMap,
            imageCompression,
            compressFiles,
            handlePrepareFiles,
            provider,
            resolvedEndpoint,
            multiple,
            accept,
            maxFileSize?.size,
            maxFileSize?.unit,
            customProps,
            enableAutoCorsConfig,
            resumable,
            onFilesUploadComplete,
            onFileUploadStart,
            onFileUploadComplete,
            onError,
            onFileUploadProgress,
            onFilesUploadProgress,
            maxRetries,
        ],
    )
    const handleCancel = useCallback(() => {
        // Abort in-flight upload
        sdkRef.current?.abort()

        // Best-effort abort multipart uploads on the provider to avoid orphaned uploads
        if (sdkRef.current && resumable?.mode === 'multipart') {
            selectedFilesMap.forEach(file => {
                void sdkRef.current?.abortMultipart(file)
            })
        }

        sdkRef.current = null

        // Revoke all blob URLs to prevent memory leak
        selectedFilesMap.forEach(file => revokeFileUrl(file))

        setUploadStatus(UploadStatus.PENDING)
        setSelectedFilesMap(new Map())

        // v2: sync cleared state into UpupCore and emit cancel event
        if (coreRef.current) {
            coreRef.current.syncFilesFromExternal(new Map())
            coreRef.current.emit('upload-cancel', {})
        }

        setFilesProgressMap({})
        setUploadSpeed(0)
        setUploadEta(0)
        setUploadedBytes(0)
        setTotalBytes(0)
    }, [resumable?.mode, selectedFilesMap])

    const handlePause = useCallback(() => {
        sdkRef.current?.pause()
        setUploadStatus(UploadStatus.PAUSED)
        // v2: emit pause event via UpupCore
        coreRef.current?.emit('upload-pause', {})
    }, [])

    const handleResume = useCallback(() => {
        sdkRef.current?.resume()
        // Reset speed tracking on resume for accurate ETA
        speedSamplesRef.current = [{ time: Date.now(), bytes: uploadedBytes }]
        setUploadStatus(UploadStatus.ONGOING)
        // v2: emit resume event via UpupCore
        coreRef.current?.emit('upload-resume', {})
    }, [uploadedBytes])

    const handleDone = useCallback(() => {
        onDoneClicked()
        // v2: emit done event before resetting state via handleCancel
        coreRef.current?.emit('done', {})
        handleCancel()
    }, [handleCancel, onDoneClicked])

    return {
        core: coreRef.current,
        mode,
        serverUrl: resolvedServerUrl,
        inputRef,
        activeAdapter,
        setActiveAdapter,
        isAddingMore,
        setIsAddingMore,
        viewMode,
        setViewMode,
        isOnline,
        translations,
        translator,
        lang,
        dir,
        themeSlots,
        files: selectedFilesMap,
        setFiles: handleSetSelectedFiles,
        dynamicUpload,
        resetState,
        dynamicallyReplaceFiles,
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
        handleFileRemove,
        editingFile,
        openImageEditor,
        closeImageEditor,
        saveImageEdit,
        replaceFile,
        oneDriveConfigs: driveConfigs?.oneDrive,
        googleDriveConfigs: driveConfigs?.googleDrive,
        dropboxConfigs: driveConfigs?.dropbox,
        upload: {
            totalProgress,
            filesProgressMap,
            proceedUpload,
            uploadStatus,
            setUploadStatus,
            uploadError,
            uploadSpeed,
            uploadEta,
            uploadedBytes,
            totalBytes,
        },
        props: {
            mini,
            dark,
            maxRetries,
            resumable,
            onError,
            onIntegrationClick,
            onFileClick,
            onFilesDragOver,
            onFilesDragLeave,
            onFilesDrop,
            enablePaste,
            uploadAdapters: resolvedAdapters,
            allowedFileTypes: accept,
            maxFileSize,
            limit,
            isProcessing,
            allowPreview,
            showSelectFolderButton,
            showBranding,
            className: className ?? '',
            style: style ?? {},
            multiple,
            icons: {
                ContainerAddMoreIcon: icons.ContainerAddMoreIcon || TbPlus,
                FileDeleteIcon: icons.FileDeleteIcon || TbTrash,
                CameraCaptureIcon: icons.CameraCaptureIcon || TbCapture,
                CameraRotateIcon: icons.CameraRotateIcon || TbCameraRotate,
                CameraDeleteIcon: icons.CameraDeleteIcon || TbTrash,
                LoaderIcon: icons.LoaderIcon || TbLoader,
            },
            classNames: resolvedClassNames as UpupUploaderPropsClassNames,
            imageEditor: resolvedImageEditor,
        },
    }
}
