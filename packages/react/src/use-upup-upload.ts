'use client'

import { useRef, useState, useEffect } from 'react'
import { UpupCore, type CoreOptions } from '@upup/core'
import { UploadStatus, type UploadFile, type UpupError } from '@upup/shared'

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

  core: UpupCore
}

/**
 * React hook that wraps `UpupCore` with reactive state updates.
 *
 * **Important:** Options are read once at mount time and are not reactive.
 * Changing `options` after the initial render has no effect. If you need
 * to reconfigure, unmount and remount the component with a new `key`.
 */
export function useUpupUpload(options: CoreOptions): UseUpupUploadReturn {
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

    return () => {
      unsub()
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

    core,
  }
}
