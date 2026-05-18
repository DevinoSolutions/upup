import { ClipboardEventHandler, DragEventHandler, useCallback, useMemo, useState } from 'react'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/RootContext'
import { isUploadActive } from '@upup/core'
import { collectDroppedFiles } from '../lib/folderDrop'

export default function useMainBox() {
    const { core } = useUploaderRuntime()
    const { files, setFiles } = useUploaderFiles()
    const { activeAdapter } = useUploaderSource()
    const { isAddingMore } = useUploaderView()
    const { upload: { uploadStatus } } = useUploaderUploadControls()
    const {
        onFilesDragOver,
        onFilesDragLeave,
        onFilesDrop,
        onWarn,
        isProcessing,
        enablePaste,
        disableDragDrop,
        folderUploadAllowDrop,
    } = useUploaderOptions()
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
        () => disableDragDrop || activeAdapter || isUploadActive(uploadStatus),
        [activeAdapter, disableDragDrop, uploadStatus],
    )

    const handleDragOver: DragEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            setIsDragging(true)
            e.dataTransfer.dropEffect = 'copy'

            const files = Array.from(e.dataTransfer.files)
            onFilesDragOver(files)
            core?.emit('drag-over', {})
        },
        [core, disableDragAction, onFilesDragOver, isProcessing],
    )

    const handleDragLeave: DragEventHandler<HTMLDivElement> = useCallback(
        e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            setIsDragging(false)

            const files = Array.from(e.dataTransfer.files)
            onFilesDragLeave(files)
            core?.emit('drag-leave', {})
        },
        [core, disableDragAction, onFilesDragLeave, isProcessing],
    )

    const handleDrop: DragEventHandler<HTMLDivElement> = useCallback(
        async e => {
            if (disableDragAction || isProcessing) return
            e.preventDefault()

            const {
                files: droppedFiles,
                skippedDirectory,
            } = await collectDroppedFiles(e.dataTransfer, folderUploadAllowDrop)

            if (skippedDirectory) {
                onWarn(
                    droppedFiles.length > 0
                        ? 'Dropped folders were ignored because folderUpload.allowDrop is disabled.'
                        : 'Folder drop is disabled. Enable folderUpload.allowDrop to accept dropped folders.',
                )
                core?.emit('folder-drop-blocked', { acceptedFiles: droppedFiles.length })
                if (droppedFiles.length === 0) {
                    setIsDragging(false)
                    return
                }
            }

            onFilesDrop(droppedFiles)
            setFiles(droppedFiles)
            core?.emit('drop', { files: droppedFiles })

            setIsDragging(false)
        },
        [core, disableDragAction, folderUploadAllowDrop, onFilesDrop, onWarn, setFiles, isProcessing],
    )

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
                core?.emit('paste', { files: pastedFiles })
            }
        },
        [core, enablePaste, isProcessing, setFiles],
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
