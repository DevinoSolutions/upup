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

  if (typeof window !== 'undefined' && !coreRef.current) {
    coreRef.current = new UpupCore(options)
  }

  useEffect(() => {
    if (!coreRef.current) {
      coreRef.current = new UpupCore(options)
      forceUpdate(n => n + 1)
    }

    const core = coreRef.current

    // Subscribe to state changes to trigger re-renders
    const unsub = core.on('state-change', () => {
      forceUpdate(n => n + 1)
    })

    // Wire convenience callbacks
    const unsubCallbacks: Array<() => void> = []

    if (options.onFileAdded) {
      unsubCallbacks.push(core.on('files-added', options.onFileAdded as (...args: unknown[]) => void))
    }
    if (options.onFileRemoved) {
      unsubCallbacks.push(core.on('file-removed', options.onFileRemoved as (...args: unknown[]) => void))
    }
    if (options.onUploadProgress) {
      unsubCallbacks.push(core.on('upload-progress', options.onUploadProgress as (...args: unknown[]) => void))
    }
    if (options.onUploadComplete) {
      unsubCallbacks.push(core.on('upload-all-complete', options.onUploadComplete as (...args: unknown[]) => void))
    }

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
