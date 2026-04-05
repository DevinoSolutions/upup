import { ClipboardEventHandler, DragEventHandler, useCallback, useMemo, useState } from 'react'
import { UploadStatus, useRootContext } from '../context/RootContext'

export default function useMainBox() {
    const {
        files,
        activeAdapter,
        isAddingMore,
        upload: { uploadStatus },
        props: { onFilesDragOver, onFilesDragLeave, onFilesDrop, isProcessing, enablePaste },
        setFiles,
    } = useRootContext()
    const [isDragging, setIsDragging] = useState(false)

    const absoluteIsDragging = useMemo(
        () => isDragging && !activeAdapter,
        [isDragging, activeAdapter],
    )

    const absoluteHasBorder = useMemo(
        () => (!files.size || isAddingMore || isDragging) && !activeAdapter,
        [activeAdapter, files.size, isAddingMore, isDragging],
    )

    const disableDragAction = useMemo(
        () => activeAdapter ?? uploadStatus === UploadStatus.ONGOING,
        [activeAdapter, uploadStatus],
    )

    const handleDragOver: DragEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            setIsDragging(true)
            e.dataTransfer.dropEffect = 'copy'

            const files = Array.from(e.dataTransfer.files)
            onFilesDragOver(files)
        },
        [disableDragAction, onFilesDragOver, isProcessing],
    )

    const handleDragLeave: DragEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            setIsDragging(false)

            const files = Array.from(e.dataTransfer.files)
            onFilesDragLeave(files)
        },
        [disableDragAction, onFilesDragLeave, isProcessing],
    )

    const handleDrop: DragEventHandler<HTMLDivElement> = useCallback(
        async e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            const dt = e.dataTransfer
            const items = Array.from(dt.items || [])
            let droppedFiles: File[] = []
            // Attempt directory-aware traversal using File System Access API or webkit entries
            const supportsEntries = (items[0] as any)?.webkitGetAsEntry
            if (supportsEntries) {
                const traverse = async (entry: any): Promise<File[]> => {
                    if (entry.isFile) {
                        return await new Promise<File[]>((resolve, reject) => {
                            entry.file((file: File) => {
                                try {
                                    // Attach synthetic relativePath so UI can build a tree
                                    const path =
                                        entry.fullPath || `/${file.name}`
                                    Object.defineProperty(
                                        file,
                                        'relativePath',
                                        {
                                            value: path.replace(/^\//, ''),
                                            configurable: true,
                                            enumerable: false,
                                            writable: false,
                                        },
                                    )
                                } catch {
                                    // noop
                                }
                                resolve([file])
                            }, reject)
                        })
                    } else if (entry.isDirectory) {
                        const reader = entry.createReader()
                        const entries: any[] = await new Promise(
                            (resolve, reject) => {
                                reader.readEntries(resolve, reject)
                            },
                        )
                        const all = await Promise.all(entries.map(traverse))
                        return all.flat()
                    }
                    return []
                }
                const filesArrays = await Promise.all(
                    items
                        .map(it => (it as any).webkitGetAsEntry?.())
                        .filter(Boolean)
                        .map(traverse),
                )
                droppedFiles = filesArrays.flat()
            } else if ('getAsFileSystemHandle' in (items[0] || ({} as any))) {
                // Newer FS Access API (optional; broad browser support not guaranteed)
                const traverseHandle = async (
                    h: any,
                    path = '',
                ): Promise<File[]> => {
                    if (h.kind === 'file') {
                        const file = await h.getFile()
                        try {
                            Object.defineProperty(file, 'relativePath', {
                                value: path + file.name,
                                configurable: true,
                                enumerable: false,
                                writable: false,
                            })
                        } catch {
                            // noop
                        }
                        return [file]
                    } else if (h.kind === 'directory') {
                        const out: File[] = []
                        for await (const [name, child] of h.entries()) {
                            out.push(
                                ...(await traverseHandle(
                                    child,
                                    path + name + '/',
                                )),
                            )
                        }
                        return out
                    }
                    return []
                }
                const handles = await Promise.all(
                    items.map(
                        async it => await (it as any).getAsFileSystemHandle?.(),
                    ),
                )
                const all = await Promise.all(
                    handles.filter(Boolean).map((h: any) => traverseHandle(h)),
                )
                droppedFiles = all.flat()
            } else {
                // Fallback: plain files (most browsers will already include nested files when a folder is dropped in Chromium)
                droppedFiles = Array.from(dt.files)
            }

            onFilesDrop(droppedFiles)
            setFiles(droppedFiles)

            setIsDragging(false)
        },
        [disableDragAction, onFilesDrop, setFiles, isProcessing],
    )

    // v2: clipboard paste support
    const handlePaste: ClipboardEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (!enablePaste || isProcessing) return
            const items = Array.from(e.clipboardData?.items || [])
            const pastedFiles: File[] = []
            for (const item of items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile()
                    if (file) {
                        // Generate a name for pasted images (screenshots etc.)
                        const name = file.name === 'image.png' || !file.name
                            ? `pasted-${Date.now()}.${file.type.split('/')[1] || 'png'}`
                            : file.name
                        const renamed = new File([file], name, { type: file.type })
                        pastedFiles.push(renamed)
                    }
                }
            }
            if (pastedFiles.length > 0) {
                e.preventDefault()
                setFiles(pastedFiles)
            }
        },
        [enablePaste, isProcessing, setFiles],
    )

    return {
        isDragging,
        absoluteIsDragging,
        absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
    }
}
