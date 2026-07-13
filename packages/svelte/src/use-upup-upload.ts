import { onMount, onDestroy } from 'svelte'
import { writable, type Writable } from 'svelte/store'
import { UpupCore, UploadStatus } from '@useupup/core'
import type { CoreOptions, UploadFile, ExtensionMethods } from '@useupup/core'

export interface UseUpupUploadOptions extends CoreOptions {
    onFileAdded?: (files: UploadFile[]) => void
    onFileRemoved?: (file: UploadFile) => void
    onUploadProgress?: (progress: {
        fileId: string
        loaded: number
        total: number
    }) => void
    onUploadComplete?: (files: UploadFile[]) => void
}

export interface UseUpupUploadReturn {
    files: Writable<UploadFile[]>
    status: Writable<UploadStatus>
    progress: Writable<{
        totalFiles: number
        completedFiles: number
        percentage: number
    }>
    error: Writable<Error | null>
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
}

export function useUpupUpload(
    options: UseUpupUploadOptions,
): UseUpupUploadReturn {
    const core = new UpupCore(options)
    const files = writable<UploadFile[]>([...core.files.values()])
    const status = writable<UploadStatus>(core.status)
    const progress = writable({
        totalFiles: 0,
        completedFiles: 0,
        percentage: 0,
    })
    const error = writable<Error | null>(null)
    const unsubs: Array<() => void> = []

    onMount(() => {
        unsubs.push(
            core.on('state-change', () => {
                files.set([...core.files.values()])
                status.set(core.status)
                progress.set(core.progress)
                error.set(core.error)
            }),
        )
        const {
            onFileAdded,
            onFileRemoved,
            onUploadProgress,
            onUploadComplete,
        } = options
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
    })

    onDestroy(() => {
        unsubs.forEach(u => {
            u()
        })
        core.destroy()
    })

    // Untyped passthrough for the port's string-typed public `on` — the typed
    // CoreEvents surface lives on core itself (F-723). Dynamic string names
    // route through the namespaced overload (same runtime dispatch).
    const onUntyped = (ev: string, hh: (p: unknown) => void): (() => void) =>
        core.on(ev as `${string}:${string}`, hh)

    return {
        files,
        status,
        progress,
        error,
        addFiles: (f: File[]) => core.addFiles(f),
        removeFile: (id: string) => {
            core.removeFile(id)
        },
        removeAll: () => {
            core.removeAll()
        },
        setFiles: (f: File[]) => core.setFiles(f),
        reorderFiles: (ids: string[]) => {
            core.reorderFiles(ids)
        },
        upload: () => core.upload(),
        pause: () => {
            core.pause()
        },
        resume: () => {
            core.resume()
        },
        cancel: () => {
            core.cancel()
        },
        retry: (id?: string) => core.retry(id),
        on: (e: string, h: (...args: unknown[]) => void) => onUntyped(e, h),
        ext: core.ext,
        core,
    }
}
