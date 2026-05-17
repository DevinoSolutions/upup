'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UpupCore, type CoreOptions } from '@upup/core'
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
  onFileAdded?: (files: UploadFile[]) => void
  onFileRemoved?: (file: UploadFile) => void
  onUploadProgress?: (progress: { fileId: string; loaded: number; total: number }) => void
  onUploadComplete?: (files: UploadFile[]) => void
}

export function useUpupUpload(options: UseUpupUploadOptions): UseUpupUploadReturn {
  const coreRef = useRef<UpupCore | null>(null)
  const [, forceUpdate] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

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
    forceUpdate(n => n + 1)

    // Subscribe to state changes to trigger re-renders
    const unsub = core.on('state-change', () => {
      forceUpdate(n => n + 1)
    })

    // Wire convenience callbacks through refs for freshness
    const unsubCallbacks: Array<() => void> = [
      core.on('files-added', (...args: unknown[]) => onFileAddedRef.current?.(...args as [UploadFile[]])),
      core.on('file-removed', (...args: unknown[]) => onFileRemovedRef.current?.(...args as [UploadFile])),
      core.on('upload-progress', (...args: unknown[]) => onUploadProgressRef.current?.(...args as [{ fileId: string; loaded: number; total: number }])),
      core.on('upload-all-complete', (...args: unknown[]) => onUploadCompleteRef.current?.(...args as [UploadFile[]])),
    ]

    return () => {
      unsub()
      for (const u of unsubCallbacks) u()
      core.destroy()
      coreRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    coreRef.current?.updateOptions(options)
  }, [options])

  const fallbackCore = coreRef.current
  const disableDragAction = fallbackCore?.status === UploadStatus.UPLOADING

  const propGetters = createPropGetters({
    addFiles: (files) => coreRef.current?.addFiles(files) ?? Promise.resolve(),
    status: fallbackCore?.status ?? UploadStatus.IDLE,
    allowedFileTypes: options.allowedFileTypes as string | undefined,
    multiple: options.limit !== 1,
    isDragging,
    setIsDragging,
    disableDragAction,
  })

  const fallback = useMemo<UseUpupUploadReturn>(() => ({
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
    }), [propGetters])

  const core = coreRef.current
  const addFiles = useCallback((files: File[]) => coreRef.current?.addFiles(files) ?? Promise.resolve(), [])
  const removeFile = useCallback((id: string) => coreRef.current?.removeFile(id), [])
  const removeAll = useCallback(() => coreRef.current?.removeAll(), [])
  const setFiles = useCallback((files: File[]) => coreRef.current?.setFiles(files) ?? Promise.resolve(), [])
  const reorderFiles = useCallback((fileIds: string[]) => coreRef.current?.reorderFiles(fileIds), [])
  const upload = useCallback(() => coreRef.current?.upload() ?? Promise.resolve([]), [])
  const pause = useCallback(() => coreRef.current?.pause(), [])
  const resume = useCallback(() => coreRef.current?.resume(), [])
  const cancel = useCallback(() => coreRef.current?.cancel(), [])
  const retry = useCallback((fileId?: string) => coreRef.current?.retry(fileId) ?? Promise.resolve([]), [])
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    return coreRef.current?.on(event, handler) ?? (() => {})
  }, [])

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
