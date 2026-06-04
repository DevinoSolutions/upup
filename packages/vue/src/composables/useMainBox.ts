import { computed, ref } from 'vue'
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
    const runtimeCtx = useUploaderRuntime()
    const filesCtx = useUploaderFiles()
    const sourceCtx = useUploaderSource()
    const viewCtx = useUploaderView()
    const uploadCtx = useUploaderUploadControls()
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

    const isDragging = ref(false)

    const absoluteIsDragging = computed(
        () => isDragging.value && !sourceCtx.activeAdapter,
    )

    const absoluteHasBorder = computed(
        () => (!filesCtx.files.size || viewCtx.isAddingMore || isDragging.value) && !sourceCtx.activeAdapter,
    )

    const disableDragAction = computed(
        () => disableDragDrop || sourceCtx.activeAdapter || isUploadActive(uploadCtx.upload.uploadStatus),
    )

    function handleDragOver(e: DragEvent) {
        if (disableDragAction.value || isProcessing) return
        e.preventDefault()

        isDragging.value = true
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'

        const droppedFiles = Array.from(e.dataTransfer?.files || [])
        onFilesDragOver(droppedFiles)
        runtimeCtx.core?.emit('drag-over', {})
    }

    function handleDragLeave(e: DragEvent) {
        if (disableDragAction.value || isProcessing) return
        e.preventDefault()

        isDragging.value = false

        const droppedFiles = Array.from(e.dataTransfer?.files || [])
        onFilesDragLeave(droppedFiles)
        runtimeCtx.core?.emit('drag-leave', {})
    }

    async function handleDrop(e: DragEvent) {
        if (disableDragAction.value || isProcessing) return
        e.preventDefault()

        if (!e.dataTransfer) {
            isDragging.value = false
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
            runtimeCtx.core?.emit('folder-drop-blocked', { acceptedFiles: droppedFiles.length })
            if (droppedFiles.length === 0) {
                isDragging.value = false
                return
            }
        }

        onFilesDrop(droppedFiles)
        filesCtx.setFiles(droppedFiles)
        runtimeCtx.core?.emit('drop', { files: droppedFiles })

        isDragging.value = false
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
            filesCtx.setFiles(pastedFiles)
            runtimeCtx.core?.emit('paste', { files: pastedFiles })
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
