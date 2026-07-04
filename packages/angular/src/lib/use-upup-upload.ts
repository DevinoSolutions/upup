import { signal, type WritableSignal } from '@angular/core'
import { UpupCore, UploadStatus } from '@upup/core'
import type { CoreOptions, UploadFile, ExtensionMethods } from '@upup/core'

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
        removeFile: (id: string) => core.removeFile(id),
        removeAll: () => core.removeAll(),
        setFiles: (f: File[]) => core.setFiles(f),
        reorderFiles: (ids: string[]) => core.reorderFiles(ids),
        upload: () => core.upload(),
        pause: () => core.pause(),
        resume: () => core.resume(),
        cancel: () => core.cancel(),
        retry: (id?: string) => core.retry(id),
        on: (e: string, h: (payload: unknown) => void) => core.on(e, h),
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
            if (options.onFileAdded) {
                unsubs.push(
                    core.on('files-added', payload => {
                        options.onFileAdded!(payload as UploadFile[])
                    }),
                )
            }
            if (options.onFileRemoved) {
                unsubs.push(
                    core.on('file-removed', payload => {
                        options.onFileRemoved!(payload as UploadFile)
                    }),
                )
            }
            if (options.onUploadProgress) {
                unsubs.push(
                    core.on('upload-progress', payload => {
                        options.onUploadProgress!(
                            payload as {
                                fileId: string
                                loaded: number
                                total: number
                            },
                        )
                    }),
                )
            }
            if (options.onUploadComplete) {
                unsubs.push(
                    core.on('upload-all-complete', payload => {
                        options.onUploadComplete!(payload as UploadFile[])
                    }),
                )
            }
        },

        destroy() {
            if (destroyed) return
            destroyed = true
            unsubs.forEach(u => u())
            unsubs.length = 0
            core.destroy()
        },
    }
}
