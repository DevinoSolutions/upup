import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import { UpupCore, UploadStatus } from '@upupjs/core'
import type { CoreOptions, UploadFile, ExtensionMethods } from '@upupjs/core'

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
    files: ReturnType<typeof shallowRef<UploadFile[]>>
    status: ReturnType<typeof ref<UploadStatus>>
    progress: ReturnType<
        typeof ref<{
            totalFiles: number
            completedFiles: number
            percentage: number
        }>
    >
    error: ReturnType<typeof shallowRef<Error | null>>

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

    const files = shallowRef<UploadFile[]>([...core.files.values()])
    const status = ref<UploadStatus>(core.status)
    const progress = ref({ totalFiles: 0, completedFiles: 0, percentage: 0 })
    const error = shallowRef<Error | null>(null)

    const unsubs: Array<() => void> = []

    onMounted(() => {
        unsubs.push(
            core.on('state-change', () => {
                files.value = [...core.files.values()]
                status.value = core.status
                progress.value = core.progress
                error.value = core.error
            }),
        )

        const {
            onFileAdded,
            onFileRemoved,
            onUploadProgress,
            onUploadComplete,
        } = options
        if (onFileAdded) {
            unsubs.push(
                core.on('files-added', (...args: unknown[]) => {
                    onFileAdded(...(args as [UploadFile[]]))
                }),
            )
        }
        if (onFileRemoved) {
            unsubs.push(
                core.on('file-removed', (...args: unknown[]) => {
                    onFileRemoved(...(args as [UploadFile]))
                }),
            )
        }
        if (onUploadProgress) {
            unsubs.push(
                core.on('upload-progress', (...args: unknown[]) => {
                    onUploadProgress(
                        ...(args as [
                            { fileId: string; loaded: number; total: number },
                        ]),
                    )
                }),
            )
        }
        if (onUploadComplete) {
            unsubs.push(
                core.on('upload-all-complete', (...args: unknown[]) => {
                    onUploadComplete(...(args as [UploadFile[]]))
                }),
            )
        }
    })

    onUnmounted(() => {
        unsubs.forEach(u => {
            u()
        })
        core.destroy()
    })

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
        on: (event: string, handler: (...args: unknown[]) => void) =>
            core.on(event as `${string}:${string}`, handler),
        ext: core.ext,

        core,
    }
}
