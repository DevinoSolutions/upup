import {
    computed,
    shallowRef,
    onMounted,
    onUnmounted,
    type ComputedRef,
} from 'vue'
import { DragDropController } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/uploader-context'

interface UseUploaderPanelReturn {
    isDragging: ComputedRef<boolean>
    absoluteIsDragging: ComputedRef<boolean>
    absoluteHasBorder: ComputedRef<boolean>
    handleDragOver: (e: DragEvent) => void
    handleDragLeave: (e: DragEvent) => void
    handleDrop: (e: DragEvent) => Promise<void>
    handlePaste: (e: ClipboardEvent) => void
}

export default function useUploaderPanel(): UseUploaderPanelReturn {
    const { core, orchestrator } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const options = useUploaderOptions()
    const { disableDragDrop, isProcessing, folderUploadAllowDrop } = options

    if (!core || !orchestrator) {
        throw new Error('useUploaderPanel must be used inside <UpupUploader />')
    }

    const controller = new DragDropController({
        core,
        orchestrator,
        setFiles,
        // The file list derives from the orchestrator snapshot — derive the
        // border's file count from the same source so it stays in lockstep.
        filesSize: () => orchestrator.getSnapshot().files.size,
        options: () => options,
        props: () => ({ disableDragDrop, isProcessing, folderUploadAllowDrop }),
    })

    const snapshot = shallowRef(controller.getSnapshot())
    let unsub: (() => void) | null = null
    onMounted(() => {
        unsub = controller.subscribe(() => {
            snapshot.value = controller.getSnapshot()
        })
        controller.init()
    })
    onUnmounted(() => {
        controller.destroy()
        unsub?.()
    })

    return {
        isDragging: computed(() => snapshot.value.isDragging),
        absoluteIsDragging: computed(() => snapshot.value.absoluteIsDragging),
        absoluteHasBorder: computed(() => snapshot.value.absoluteHasBorder),
        handleDragOver: (e: DragEvent) => {
            controller.handleDragOver(e)
        },
        handleDragLeave: (e: DragEvent) => {
            controller.handleDragLeave(e)
        },
        handleDrop: (e: DragEvent) => controller.handleDrop(e),
        handlePaste: (e: ClipboardEvent) => {
            controller.handlePaste(e)
        },
    }
}
