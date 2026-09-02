import { signal, type WritableSignal } from '@angular/core'
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

export interface UpupUploadHandle {
    files: WritableSignal<UploadFile[]>
    status: WritableSignal<UploadStatus>
    progress: WritableSignal<{
        totalFiles: number
        completedFiles: number
        percentage: number
    }>
    error: WritableSignal<Error | null>
    addFiles(files: File[]): Promise<void>
    removeFile(id: string): void
    removeAll(): void
    setFiles(files: File[]): Promise<void>
    reorderFiles(ids: string[]): void
    upload(): Promise<UploadFile[]>
    pause(): void
    resume(): void
    cancel(): void
    retry(fileId?: string): Promise<UploadFile[]>
    on(event: string, handler: (payload: unknown) => void): () => void
    ext: Record<string, ExtensionMethods>
    core: UpupCore
    start(): void
    destroy(): void
}

/** Single-use: after destroy() the underlying UpupCore is destroyed; do not call start() again on the same instance. */
export function createUpupUpload(
    options: UseUpupUploadOptions,
): UpupUploadHandle {
    const core = new UpupCore(options)
    const files = signal<UploadFile[]>([...core.files.values()])
    const status = signal<UploadStatus>(core.status)
    const progress = signal({ totalFiles: 0, completedFiles: 0, percentage: 0 })
    const error = signal<Error | null>(null)
    const unsubs: Array<() => void> = []
    let started = false
    let destroyed = false

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
        // Untyped passthrough — this port's public `on` stays string-typed;
        // the typed CoreEvents surface lives on core itself (F-723). Dynamic
        // names route through the namespaced overload (same runtime dispatch).
        on: (e: string, h: (payload: unknown) => void) =>
            core.on(e as `${string}:${string}`, h),
        ext: core.ext,
        core,

        start() {
            if (started) return
            started = true

            // Sync signals on every state-change
            unsubs.push(
                core.on('state-change', () => {
                    files.set([...core.files.values()])
                    status.set(core.status)
                    progress.set(core.progress)
                    error.set(core.error)
                }),
            )

            // Forward optional callbacks.
            // core.emit(event, payload) calls handler(payload) — single payload arg.
            const onFileAdded = options.onFileAdded
            if (onFileAdded) {
                unsubs.push(
                    core.on('files-added', payload => {
                        onFileAdded(payload)
                    }),
                )
            }
            const onFileRemoved = options.onFileRemoved
            if (onFileRemoved) {
                unsubs.push(
                    core.on('file-removed', payload => {
                        onFileRemoved(payload)
                    }),
                )
            }
            const onUploadProgress = options.onUploadProgress
            if (onUploadProgress) {
                unsubs.push(
                    core.on('upload-progress', payload => {
                        onUploadProgress(payload)
                    }),
                )
            }
            const onUploadComplete = options.onUploadComplete
            if (onUploadComplete) {
                unsubs.push(
                    core.on('upload-all-complete', payload => {
                        onUploadComplete(payload)
                    }),
                )
            }
        },

        destroy() {
            if (destroyed) return
            destroyed = true
            unsubs.forEach(u => {
                u()
            })
            unsubs.length = 0
            core.destroy()
        },
    }
}
