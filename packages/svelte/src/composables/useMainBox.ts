import { writable, derived, get } from 'svelte/store'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/root-context'
import { isUploadActive, collectDroppedFiles } from '@upup/core'

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

    const isDragging = writable(false)

    const absoluteIsDragging = derived(
        [isDragging, activeAdapter],
        ([$isDragging, $activeAdapter]) => $isDragging && !$activeAdapter,
    )

    const absoluteHasBorder = derived(
        [files, isAddingMore, isDragging, activeAdapter],
        ([$files, $isAddingMore, $isDragging, $activeAdapter]) =>
            (!$files.size || $isAddingMore || $isDragging) && !$activeAdapter,
    )

    const disableDragAction = derived(
        [activeAdapter, uploadStatus],
        ([$activeAdapter, $uploadStatus]) =>
            disableDragDrop || !!$activeAdapter || isUploadActive($uploadStatus),
    )

    function handleDragOver(e: DragEvent) {
        if (get(disableDragAction) || isProcessing) return
        e.preventDefault()

        isDragging.set(true)
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'

        const droppedFiles = Array.from(e.dataTransfer?.files || [])
        onFilesDragOver(droppedFiles)
        core?.emit('drag-over', {})
    }

    function handleDragLeave(e: DragEvent) {
        if (get(disableDragAction) || isProcessing) return
        e.preventDefault()

        isDragging.set(false)

        const droppedFiles = Array.from(e.dataTransfer?.files || [])
        onFilesDragLeave(droppedFiles)
        core?.emit('drag-leave', {})
    }

    async function handleDrop(e: DragEvent) {
        if (get(disableDragAction) || isProcessing) return
        e.preventDefault()

        if (!e.dataTransfer) {
            isDragging.set(false)
            return
        }

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
                isDragging.set(false)
                return
            }
        }

        onFilesDrop(droppedFiles)
        setFiles(droppedFiles)
        core?.emit('drop', { files: droppedFiles })

        isDragging.set(false)
    }

    function handlePaste(e: ClipboardEvent) {
        if (!enablePaste || isProcessing) return
        const items = Array.from(e.clipboardData?.items || [])
        const pastedFiles: File[] = []
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile()
                if (file) {
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
    }

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
