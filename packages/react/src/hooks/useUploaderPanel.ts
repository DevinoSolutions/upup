import {
    ClipboardEventHandler,
    DragEventHandler,
    useEffect,
    useRef,
    useSyncExternalStore,
} from 'react'
import { DragDropController, type DragDropSnapshot } from '@upup/core/internal'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
} from '../context/UploaderContext'

const EMPTY_SNAPSHOT: DragDropSnapshot = {
    isDragging: false,
    absoluteIsDragging: false,
    absoluteHasBorder: true,
}
const NOOP = () => {}
const NOOP_SUBSCRIBE = () => () => {}
const getEmptySnapshot = () => EMPTY_SNAPSHOT

export default function useUploaderPanel() {
    const { core, orchestrator } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const options = useUploaderOptions()

    // Keep the latest values for the controller to read fresh (React re-reads each render).
    const latest = useRef({ setFiles, options })
    latest.current = { setFiles, options }

    // Construct lazily, only once core + orchestrator exist (both are null on the first render).
    const controllerRef = useRef<DragDropController | null>(null)
    if (!controllerRef.current && core && orchestrator) {
        controllerRef.current = new DragDropController({
            core,
            orchestrator,
            setFiles: files => { latest.current.setFiles(files); },
            // The file list derives from the orchestrator snapshot — derive the
            // border's file count from the same source so it stays in lockstep.
            filesSize: () => orchestrator.getSnapshot().files.size,
            options: () => latest.current.options,
            props: () => ({
                disableDragDrop: latest.current.options.disableDragDrop,
                isProcessing: latest.current.options.isProcessing,
                folderUploadAllowDrop:
                    latest.current.options.folderUploadAllowDrop,
            }),
        })
    }
    const controller = controllerRef.current

    const snapshot = useSyncExternalStore(
        controller?.subscribe ?? NOOP_SUBSCRIBE,
        controller?.getSnapshot ?? getEmptySnapshot,
        getEmptySnapshot, // getServerSnapshot — required for SSR (renders the empty-state snapshot)
    )

    useEffect(() => {
        controller?.init()
        return () => controller?.destroy()
    }, [controller])

    // React synthetic events extend the native DOM events, so casting to DragEvent is safe.
    const handleDragOver: DragEventHandler<HTMLDivElement> = controller
        ? e => { controller.handleDragOver(e as unknown as DragEvent); }
        : NOOP
    const handleDragLeave: DragEventHandler<HTMLDivElement> = controller
        ? e => { controller.handleDragLeave(e as unknown as DragEvent); }
        : NOOP
    const handleDrop: DragEventHandler<HTMLDivElement> = controller
        ? e => {
              void controller.handleDrop(e as unknown as DragEvent)
          }
        : NOOP
    const handlePaste: ClipboardEventHandler<HTMLDivElement> = controller
        ? e => { controller.handlePaste(e as unknown as ClipboardEvent); }
        : NOOP

    return {
        isDragging: snapshot.isDragging,
        absoluteIsDragging: snapshot.absoluteIsDragging,
        absoluteHasBorder: snapshot.absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
    }
}
