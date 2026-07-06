import type React from 'react'
import type {
    ChangeEventHandler,
    HTMLAttributes,
    InputHTMLAttributes,
} from 'react'
import type { DragDropController } from '@upup/core/internal'

export interface PropGetterDeps {
    addFiles: (files: File[]) => Promise<void> | void
    status: string
    allowedFileTypes: string | undefined
    multiple: boolean
    isDragging: boolean
    /**
     * Drag/drop/paste gate (F-606). The SAME DragDropController every visual
     * panel's useUploaderPanel already runs — routing the headless path through
     * it (rather than a second, drifted inline implementation) is the one home
     * for enablePaste/isProcessing/folder-drop/filename-normalization/'paste'+
     * 'drop' core-event semantics. Optional only for back-compat with any
     * direct createPropGetters caller predating the controller wiring; the
     * shipped useUpupUpload hook always supplies one.
     */
    dragDrop?: DragDropController | undefined
}

function composeEventHandlers<E>(
    ...handlers: (((e: E) => void) | undefined)[]
): (e: E) => void {
    return (event: E) => {
        for (const handler of handlers) {
            handler?.(event)
        }
    }
}

export function createPropGetters(deps: PropGetterDeps) {
    const {
        addFiles,
        status,
        allowedFileTypes,
        multiple,
        isDragging,
        dragDrop,
    } = deps

    function getDropzoneProps(overrides: HTMLAttributes<HTMLElement> = {}) {
        // React synthetic events extend the native DOM events, so casting is
        // safe — byte-identical to useUploaderPanel.ts's handoff to the same
        // controller class.
        const onDragOver = (e: React.DragEvent<HTMLElement>) =>
            dragDrop?.handleDragOver(e as unknown as DragEvent)
        const onDragLeave = (e: React.DragEvent<HTMLElement>) =>
            dragDrop?.handleDragLeave(e as unknown as DragEvent)
        const onDrop = (e: React.DragEvent<HTMLElement>) =>
            dragDrop?.handleDrop(e as unknown as DragEvent)
        const onPaste = (e: React.ClipboardEvent<HTMLElement>) =>
            dragDrop?.handlePaste(e as unknown as ClipboardEvent)

        return {
            onDragOver: composeEventHandlers<React.DragEvent<HTMLElement>>(
                onDragOver,
                overrides.onDragOver,
            ),
            onDragLeave: composeEventHandlers<React.DragEvent<HTMLElement>>(
                onDragLeave,
                overrides.onDragLeave,
            ),
            onDrop: composeEventHandlers<React.DragEvent<HTMLElement>>(
                onDrop,
                overrides.onDrop,
            ),
            onPaste: composeEventHandlers<React.ClipboardEvent<HTMLElement>>(
                onPaste,
                overrides.onPaste,
            ),
            role: 'region' as const,
            'aria-label': 'Drop files here or click to browse',
            'aria-dropeffect': (isDragging ? 'copy' : 'none'),
            tabIndex: 0,
        }
    }

    function getRootProps(overrides: HTMLAttributes<HTMLElement> = {}) {
        const isUploading = status === 'uploading'
        return {
            ...overrides,
            role: 'application' as const,
            'aria-label': 'File uploader',
            'aria-busy': isUploading,
            'aria-describedby': undefined as string | undefined,
        }
    }

    function getInputProps(
        overrides: InputHTMLAttributes<HTMLInputElement> = {},
    ) {
        const onChange: ChangeEventHandler<HTMLInputElement> = e => {
            const fileList = e.target.files
            if (fileList) {
                addFiles(Array.from(fileList))
            }
        }
        return {
            ...overrides,
            type: 'file' as const,
            multiple,
            accept: allowedFileTypes,
            onChange: composeEventHandlers<React.ChangeEvent<HTMLInputElement>>(
                onChange,
                overrides.onChange,
            ),
            style: { display: 'none' as const },
            tabIndex: -1,
            'aria-hidden': true as const,
        }
    }

    return { getDropzoneProps, getRootProps, getInputProps }
}
