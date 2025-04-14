import { DragEventHandler, useCallback, useMemo, useState } from 'react'
import { UploadStatus, useRootContext } from '../context/RootContext'

export default function useMainBox() {
    const {
        files,
        activeAdapter,
        isAddingMore,
        upload: { uploadStatus },
        props: { onFilesDragOver, onFilesDragLeave, onFilesDrop, isProcessing },
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
        e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            const droppedFiles = Array.from(e.dataTransfer.files)

            onFilesDrop(droppedFiles)
            setFiles(droppedFiles)

            setIsDragging(false)
        },
        [disableDragAction, onFilesDrop, setFiles, isProcessing],
    )

    return {
        isDragging,
        absoluteIsDragging,
        absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    }
}
