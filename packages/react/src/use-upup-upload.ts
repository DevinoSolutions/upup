'use client'

import { useRef, useState, useEffect } from 'react'
import { UpupCore, type CoreOptions } from '@upup/core'
import { UploadStatus, type UploadFile, type UpupError } from '@upup/shared'
import type { ExtensionMethods } from '@upup/core'

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
  retry(fileId?: string): void

  on(event: string, handler: (...args: unknown[]) => void): () => void
  ext: Record<string, ExtensionMethods>

  core: UpupCore
}

export interface UseUpupUploadOptions extends CoreOptions {
  onFileAdded?: (files: UploadFile[]) => void
  onFileRemoved?: (file: UploadFile) => void
  onUploadProgress?: (progress: { fileId: string; loaded: number; total: number }) => void
  onUploadComplete?: (files: UploadFile[]) => void
}

/**
 * React hook that wraps `UpupCore` with reactive state updates.
 *
 * **Important:** Options are read once at mount time and are not reactive.
 * Changing `options` after the initial render has no effect. If you need
 * to reconfigure, unmount and remount the component with a new `key`.
 */
export function useUpupUpload(options: UseUpupUploadOptions): UseUpupUploadReturn {
  const coreRef = useRef<UpupCore | null>(null)
  const [, forceUpdate] = useState(0)

  // Lazy initialization — safe during SSR
  if (typeof window !== 'undefined' && !coreRef.current) {
    coreRef.current = new UpupCore(options)
  }

  useEffect(() => {
    // Hydration fallback
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

  const core = coreRef.current!

  // If SSR (core not yet initialized), return defaults
  if (!core) {
    return {
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
      retry: () => {},
      on: () => () => {},
      ext: {},
      core: null as unknown as UpupCore,
    }
  }

  return {
    files: [...core.files.values()],
    status: core.status,
    progress: core.progress,
    error: core.error as UpupError | null,

    addFiles: (files) => core.addFiles(files),
    removeFile: (id) => core.removeFile(id),
    removeAll: () => core.removeAll(),
    setFiles: (files) => core.setFiles(files),
    reorderFiles: (fileIds) => core.reorderFiles(fileIds),

    upload: () => core.upload(),
    pause: () => core.pause(),
    resume: () => core.resume(),
    cancel: () => core.cancel(),
    retry: (fileId) => core.retry(fileId),

    on: (event, handler) => core.on(event, handler),
    ext: core.ext,

    core,
  }
}
