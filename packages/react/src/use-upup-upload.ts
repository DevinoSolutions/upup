'use client'

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react'
import { UpupCore, type CoreOptions } from '@upup/core'
import { DragDropController, UploaderOrchestrator } from '@upup/core/internal'
import { UploadStatus, type UploadFile, type UpupError } from '@upup/core'
import type { ExtensionMethods } from '@upup/core'
import { createPropGetters } from './prop-getters'

export interface UseUpupUploadReturn {
    files: UploadFile[]
    status: UploadStatus
    progress: { totalFiles: number; completedFiles: number; percentage: number }
    error: UpupError | null

    addFiles(files: File[]): Promise<void>
    removeFile(id: string): void
    removeAll(): void
    setFiles(files: File[]): Promise<void>
    reorderFiles(fileIds: string[]): void

    upload(): Promise<UploadFile[]>
    pause(): void
    resume(): void
    cancel(): void
    retry(fileId?: string): Promise<UploadFile[]>

    on(event: string, handler: (...args: unknown[]) => void): () => void
    ext: Record<string, ExtensionMethods>

    core: UpupCore

    getDropzoneProps: ReturnType<typeof createPropGetters>['getDropzoneProps']
    getRootProps: ReturnType<typeof createPropGetters>['getRootProps']
    getInputProps: ReturnType<typeof createPropGetters>['getInputProps']
}

export interface UseUpupUploadOptions extends CoreOptions {
    onFileAdded?: ((files: UploadFile[]) => void) | undefined
    onFileRemoved?: ((file: UploadFile) => void) | undefined
    onUploadProgress?:
        | ((progress: {
              fileId: string
              loaded: number
              total: number
          }) => void)
        | undefined
    onUploadComplete?: ((files: UploadFile[]) => void) | undefined

    // ── F-606: drag/drop/paste gating, mirroring <UpupUploader>'s own props ──
    // (packages/core/src/types/uploader-props.ts's UploaderBaseProps) so the
    // headless path can honor the SAME rules the visual panel does. These are
    // UI-package concerns, deliberately NOT added to core's engine-level
    // CoreOptions (packages/core/src/options/types.ts) — @upup/core stays
    // framework-agnostic with zero opinions on drag/drop UI gating.
    /** Enable clipboard paste uploads (Ctrl+V / Cmd+V). Default false. */
    enablePaste?: boolean | undefined
    /** Disable drag-and-drop (keep browse/click functional). Default false. */
    disableDragDrop?: boolean | undefined
    /** When true, drag/drop/paste are no-ops (e.g. while another action is mid-flight). */
    isProcessing?: boolean | undefined
    /** Folder upload configuration (drag-and-drop folder traversal). */
    folderUpload?: { allowDrop?: boolean | undefined } | undefined
    onWarn?: ((warningMessage: string) => void) | undefined
}

const EMPTY_DRAG_SNAPSHOT = {
    isDragging: false,
    absoluteIsDragging: false,
    absoluteHasBorder: true,
}
const NOOP_SUBSCRIBE = () => () => {}
const getEmptyDragSnapshot = () => EMPTY_DRAG_SNAPSHOT

export function useUpupUpload(
    options: UseUpupUploadOptions,
): UseUpupUploadReturn {
    const coreRef = useRef<UpupCore | null>(null)
    const dragDropRef = useRef<DragDropController | null>(null)
    const [, forceUpdate] = useState(0)

    // Keep the latest options for the controller's getters to read fresh
    // (React re-reads each render — same freshness contract as useUploaderPanel.ts).
    const optionsRef = useRef(options)
    optionsRef.current = options

    // Callback refs — always hold latest callbacks, avoiding stale closures
    const onFileAddedRef = useRef(options.onFileAdded)
    const onFileRemovedRef = useRef(options.onFileRemoved)
    const onUploadProgressRef = useRef(options.onUploadProgress)
    const onUploadCompleteRef = useRef(options.onUploadComplete)

    // Sync refs every render (intentionally no deps)
    useEffect(() => {
        onFileAddedRef.current = options.onFileAdded
        onFileRemovedRef.current = options.onFileRemoved
        onUploadProgressRef.current = options.onUploadProgress
        onUploadCompleteRef.current = options.onUploadComplete
    })

    useEffect(() => {
        const core = new UpupCore(options)
        coreRef.current = core

        // Minimal headless orchestrator (F-606): DragDropController's only hard
        // dependency, built the same way createUploaderController builds the
        // panel's — the ctor is plain-state-only (no plugin/theme registration,
        // that lives in createUploaderController/.init(), neither called here),
        // so this stays a lean headless wrapper, not a second panel.
        const orchestrator = new UploaderOrchestrator(core, {})
        const dragDrop = new DragDropController({
            core,
            orchestrator,
            // Append (core.addFiles), NOT replace (core.setFiles) — preserves
            // the headless hook's existing drop/paste semantics; only the
            // GATING (enablePaste/isProcessing/folder-drop/filename/events)
            // was the bug, not the append-vs-replace choice.
            setFiles: files => core.addFiles(files),
            filesSize: () => orchestrator.getSnapshot().files.size,
            options: () => ({
                ...(optionsRef.current.enablePaste !== undefined
                    ? { enablePaste: optionsRef.current.enablePaste }
                    : {}),
                ...(optionsRef.current.onWarn !== undefined
                    ? { onWarn: optionsRef.current.onWarn }
                    : {}),
            }),
            props: () => ({
                disableDragDrop: optionsRef.current.disableDragDrop ?? false,
                isProcessing: optionsRef.current.isProcessing ?? false,
                folderUploadAllowDrop:
                    optionsRef.current.folderUpload?.allowDrop ?? false,
            }),
        })
        dragDrop.init()
        dragDropRef.current = dragDrop

        coreRef.current = core
        forceUpdate(n => n + 1)

        // Subscribe to state changes to trigger re-renders
        const unsub = core.on('state-change', () => {
            forceUpdate(n => n + 1)
        })
        const unsubDragDrop = dragDrop.subscribe(() => { forceUpdate(n => n + 1); })

        // Wire convenience callbacks through refs for freshness
        const unsubCallbacks: Array<() => void> = [
            core.on('files-added', (...args: unknown[]) =>
                onFileAddedRef.current?.(...(args as [UploadFile[]])),
            ),
            core.on('file-removed', (...args: unknown[]) =>
                onFileRemovedRef.current?.(...(args as [UploadFile])),
            ),
            core.on('upload-progress', (...args: unknown[]) =>
                onUploadProgressRef.current?.(
                    ...(args as [
                        { fileId: string; loaded: number; total: number },
                    ]),
                ),
            ),
            core.on('upload-all-complete', (...args: unknown[]) =>
                onUploadCompleteRef.current?.(...(args as [UploadFile[]])),
            ),
        ]

        return () => {
            unsub()
            unsubDragDrop()
            for (const u of unsubCallbacks) u()
            dragDrop.destroy()
            dragDropRef.current = null
            core.destroy()
            coreRef.current = null
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        coreRef.current?.updateOptions(options)
    }, [options])

    const dragSnapshot = useSyncExternalStore(
        dragDropRef.current?.subscribe ?? NOOP_SUBSCRIBE,
        dragDropRef.current?.getSnapshot ?? getEmptyDragSnapshot,
        getEmptyDragSnapshot,
    )

    const fallbackCore = coreRef.current

    const propGetters = createPropGetters({
        addFiles: files =>
            coreRef.current?.addFiles(files) ?? Promise.resolve(),
        status: fallbackCore?.status ?? UploadStatus.IDLE,
        allowedFileTypes: options.allowedFileTypes,
        multiple: options.limit !== 1,
        isDragging: dragSnapshot.isDragging,
        dragDrop: dragDropRef.current ?? undefined,
    })

    const fallback = useMemo<UseUpupUploadReturn>(
        () => ({
            files: [],
            status: UploadStatus.IDLE,
            progress: { totalFiles: 0, completedFiles: 0, percentage: 0 },
            error: null,
            addFiles: async () => {},
            removeFile: () => {},
            removeAll: () => {},
            setFiles: async () => {},
            reorderFiles: () => {},
            upload: async () => [],
            pause: () => {},
            resume: () => {},
            cancel: () => {},
            retry: async () => [],
            on: () => () => {},
            ext: {},
            core: null as unknown as UpupCore,
            ...propGetters,
        }),
        [propGetters],
    )

    const core = coreRef.current
    const addFiles = useCallback(
        (files: File[]) =>
            coreRef.current?.addFiles(files) ?? Promise.resolve(),
        [],
    )
    const removeFile = useCallback(
        (id: string) => coreRef.current?.removeFile(id),
        [],
    )
    const removeAll = useCallback(() => coreRef.current?.removeAll(), [])
    const setFiles = useCallback(
        (files: File[]) =>
            coreRef.current?.setFiles(files) ?? Promise.resolve(),
        [],
    )
    const reorderFiles = useCallback(
        (fileIds: string[]) => coreRef.current?.reorderFiles(fileIds),
        [],
    )
    const upload = useCallback(
        () => coreRef.current?.upload() ?? Promise.resolve([]),
        [],
    )
    const pause = useCallback(() => coreRef.current?.pause(), [])
    const resume = useCallback(() => coreRef.current?.resume(), [])
    const cancel = useCallback(() => coreRef.current?.cancel(), [])
    const retry = useCallback(
        (fileId?: string) =>
            coreRef.current?.retry(fileId) ?? Promise.resolve([]),
        [],
    )
    const on = useCallback(
        (event: string, handler: (...args: unknown[]) => void) => {
            return coreRef.current?.on(event, handler) ?? (() => {})
        },
        [],
    )

    if (!core) return fallback

    return {
        files: [...core.files.values()],
        status: core.status,
        progress: core.progress,
        error: core.error as UpupError | null,

        addFiles,
        removeFile,
        removeAll,
        setFiles,
        reorderFiles,

        upload,
        pause,
        resume,
        cancel,
        retry,

        on,
        ext: core.ext,

        core,

        ...propGetters,
    }
}
