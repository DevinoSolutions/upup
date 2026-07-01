import { computed, shallowRef, onMounted, onUnmounted } from 'vue'
import { DragDropController } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/root-context'

export default function useUploaderPanel() {
    const { core, orchestrator } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const options = useUploaderOptions()
    const { disableDragDrop, isProcessing, folderUploadAllowDrop } = options

    const controller = new DragDropController({
        core: core!,
        orchestrator: orchestrator!,
        setFiles,
        // The file list derives from the orchestrator snapshot — derive the
        // border's file count from the same source so it stays in lockstep.
        filesSize: () => orchestrator!.getSnapshot().files.size,
        options: () => options,
        props: () => ({ disableDragDrop, isProcessing, folderUploadAllowDrop }),
    })

    const snapshot = shallowRef(controller.getSnapshot())
    let unsub: (() => void) | null = null
    onMounted(() => {
        unsub = controller.subscribe(() => { snapshot.value = controller.getSnapshot() })
        controller.init()
    })
    onUnmounted(() => { controller.dispose(); unsub?.() })

    return {
        isDragging: computed(() => snapshot.value.isDragging),
        absoluteIsDragging: computed(() => snapshot.value.absoluteIsDragging),
        absoluteHasBorder: computed(() => snapshot.value.absoluteHasBorder),
        handleDragOver: controller.handleDragOver,
        handleDragLeave: controller.handleDragLeave,
        handleDrop: controller.handleDrop,
        handlePaste: controller.handlePaste,
    }
}
