import { onMount, onDestroy } from 'svelte'
import { derived, type Readable } from 'svelte/store'
import { DragDropController } from '@useupup/core/internal'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/uploader-context'
import { toReadable } from '../lib/to-readable'

export interface UseUploaderPanelReturn {
    isDragging: Readable<boolean>
    absoluteIsDragging: Readable<boolean>
    absoluteHasBorder: Readable<boolean>
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

    if (!core || !orchestrator)
        throw new Error(
            'useUploaderPanel must be used inside an initialized <UpupUploader />',
        )

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

    const state = toReadable(controller)
    onMount(() => {
        controller.init()
    })
    onDestroy(() => {
        controller.destroy()
    })

    return {
        isDragging: derived(state, $s => $s.isDragging),
        absoluteIsDragging: derived(state, $s => $s.absoluteIsDragging),
        absoluteHasBorder: derived(state, $s => $s.absoluteHasBorder),
        handleDragOver: controller.handleDragOver.bind(controller),
        handleDragLeave: controller.handleDragLeave.bind(controller),
        handleDrop: controller.handleDrop.bind(controller),
        handlePaste: controller.handlePaste.bind(controller),
    }
}
