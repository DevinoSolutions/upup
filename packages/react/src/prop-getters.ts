import type React from 'react'
import type {
    ChangeEventHandler,
    HTMLAttributes,
    InputHTMLAttributes,
} from 'react'
import type { DragDropController } from '@upupjs/core/internal'

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

/**
 * Detach a fire-and-forget promise from the unhandled-rejection channel (#342).
 *
 * `core.addFiles()` emits `restriction-failed` and THEN rethrows — the rethrow
 * is deliberate, so a direct `await core.addFiles()` caller can narrow on the
 * error. But a DOM callback has nobody to rethrow to, so an ordinary restriction
 * failure (wrong type, too large, over the limit) used to surface a second time
 * as an unhandled rejection and pollute error reporting. Dropping it here loses
 * nothing: the event bus already carried the identical error before the throw.
 */
function ignoreRejection(result: Promise<unknown> | void): void {
    // Duck-typed rather than `instanceof Promise` — a dep may hand back a
    // thenable from another realm, which `instanceof` would silently miss.
    if (result && typeof result.catch === 'function') {
        result.catch(() => {})
    }
}

export interface PropGetters {
    getDropzoneProps: (
        overrides?: HTMLAttributes<HTMLElement>,
    ) => HTMLAttributes<HTMLElement>
    getRootProps: (
        overrides?: HTMLAttributes<HTMLElement>,
    ) => HTMLAttributes<HTMLElement>
    getInputProps: (
        overrides?: InputHTMLAttributes<HTMLInputElement>,
    ) => InputHTMLAttributes<HTMLInputElement>
}

export function createPropGetters(deps: PropGetterDeps): PropGetters {
    const {
        addFiles,
        status,
        allowedFileTypes,
        multiple,
        isDragging,
        dragDrop,
    } = deps

    function getDropzoneProps(
        overrides: HTMLAttributes<HTMLElement> = {},
    ): HTMLAttributes<HTMLElement> {
        // React synthetic events extend the native DOM events, so casting is
        // safe — byte-identical to useUploaderPanel.ts's handoff to the same
        // controller class.
        const onDragOver = (e: React.DragEvent<HTMLElement>): void => {
            dragDrop?.handleDragOver(e as unknown as DragEvent)
        }
        const onDragLeave = (e: React.DragEvent<HTMLElement>): void => {
            dragDrop?.handleDragLeave(e as unknown as DragEvent)
        }
        const onDrop = (e: React.DragEvent<HTMLElement>): void => {
            ignoreRejection(dragDrop?.handleDrop(e as unknown as DragEvent))
        }
        const onPaste = (e: React.ClipboardEvent<HTMLElement>): void => {
            dragDrop?.handlePaste(e as unknown as ClipboardEvent)
        }

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
            'aria-dropeffect': isDragging ? 'copy' : 'none',
            tabIndex: 0,
        }
    }

    function getRootProps(
        overrides: HTMLAttributes<HTMLElement> = {},
    ): HTMLAttributes<HTMLElement> {
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
    ): InputHTMLAttributes<HTMLInputElement> {
        const onChange: ChangeEventHandler<HTMLInputElement> = e => {
            const fileList = e.target.files
            if (fileList) {
                ignoreRejection(addFiles(Array.from(fileList)))
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
