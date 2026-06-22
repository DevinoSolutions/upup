import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import { DragDropController } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/root-context'
import { toReadable } from '../lib/to-readable'

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

    const state = toReadable(controller)
    onMount(() => controller.init())
    onDestroy(() => controller.dispose())

    return {
        isDragging: derived(state, ($s) => $s.isDragging),
        absoluteIsDragging: derived(state, ($s) => $s.absoluteIsDragging),
        absoluteHasBorder: derived(state, ($s) => $s.absoluteHasBorder),
        handleDragOver: controller.handleDragOver,
        handleDragLeave: controller.handleDragLeave,
        handleDrop: controller.handleDrop,
        handlePaste: controller.handlePaste,
    }
}
