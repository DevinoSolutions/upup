'use client'

import {
    ClipboardEventHandler,
    DragEventHandler,
    useCallback,
    useMemo,
    useState,
} from 'react'
import { useUploaderContext } from '../context/uploader-context'

export default function useMainBox() {
    const {
        files,
        activeSource,
        addFiles,
        status,
    } = useUploaderContext()

    // isAddingMore is not yet in the context — default to false
    const isAddingMore = false

    const [isDragging, setIsDragging] = useState(false)

    const absoluteIsDragging = useMemo(
        () => isDragging && !activeSource,
        [isDragging, activeSource],
    )

    const absoluteHasBorder = useMemo(
        () => (!files.length || isAddingMore || isDragging) && !activeSource,
        [activeSource, files.length, isAddingMore, isDragging],
    )

    const disableDragAction = useMemo(
        () => !!activeSource || status === 'uploading',
        [activeSource, status],
    )

    const handleDragOver: DragEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction) return
            e.preventDefault()
            setIsDragging(true)
            e.dataTransfer.dropEffect = 'copy'
        },
        [disableDragAction],
    )

    const handleDragLeave: DragEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction) return
            e.preventDefault()
            setIsDragging(false)
        },
        [disableDragAction],
    )

    const handleDrop: DragEventHandler<HTMLDivElement> = useCallback(
        async e => {
            if (disableDragAction) return
            e.preventDefault()

            const dt = e.dataTransfer
            const items = Array.from(dt.items || [])
            let droppedFiles: File[] = []

            const supportsEntries = (items[0] as any)?.webkitGetAsEntry
            if (supportsEntries) {
                const traverse = async (entry: any): Promise<File[]> => {
                    if (entry.isFile) {
                        return await new Promise<File[]>((resolve, reject) => {
                            entry.file((file: File) => {
                                try {
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
            } else {
                droppedFiles = Array.from(dt.files)
            }

            await addFiles(droppedFiles)
            setIsDragging(false)
        },
        [disableDragAction, addFiles],
    )

    const handlePaste: ClipboardEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction) return

            const items = Array.from(e.clipboardData?.items || [])
            const pastedFiles = items
                .filter(item => item.kind === 'file')
                .map(item => item.getAsFile())
                .filter((f): f is File => f !== null)

            if (!pastedFiles.length) return

            e.preventDefault()
            addFiles(pastedFiles)
        },
        [disableDragAction, addFiles],
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
