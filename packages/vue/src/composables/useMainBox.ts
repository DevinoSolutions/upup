import { computed, shallowRef, onMounted, onUnmounted } from 'vue'
import { DragDropController } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/root-context'

export default function useMainBox() {
    const { core, orchestrator } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const options = useUploaderOptions()
    const { disableDragDrop, isProcessing, folderUploadAllowDrop } = options

    const controller = new DragDropController({
        core: core!,
        orchestrator: orchestrator!,
        setFiles,
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
