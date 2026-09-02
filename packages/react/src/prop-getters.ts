import type React from 'react'
import type {
    ChangeEventHandler,
    HTMLAttributes,
    InputHTMLAttributes,
} from 'react'
import type { DragDropController } from '@useupup/core/internal'

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
function ignoreRejection(result: unknown): void {
    // Duck-typed rather than `instanceof Promise` — a dep may hand back a
    // thenable from another realm, which `instanceof` would silently miss.
    // `unknown` rather than `Promise<unknown> | void`, because the callers'
    // return types are void-unions that no narrower parameter type accepts.
    const thenable = result as { catch?: (cb: () => void) => unknown } | null
    if (typeof thenable?.catch === 'function') {
        thenable.catch(() => {})
    }
}

/**
 * All three getters share ONE override contract (#341):
 *
 *  1. `...overrides` is spread first — anything you pass survives by default.
 *  2. Getter-OWNED keys are applied after the spread and win. Only two kinds
 *     qualify: values derived from live core state, and the handful without
 *     which the element stops being an uploader element.
 *       - `getRootProps`     → `aria-busy`
 *       - `getDropzoneProps` → `aria-dropeffect`
 *       - `getInputProps`    → `type`, `multiple`, `accept` (only when core
 *                              declares a filter), `style.display`
 *  3. Event handlers are COMPOSED, never replaced: the getter's own handler
 *     runs first, then yours.
 *  4. `style` is MERGED, not replaced.
 *  5. Everything else the getters set — `role`, `aria-label`, `tabIndex`,
 *     `aria-hidden` — is a DEFAULT you may override.
 *
 * Pinned by tests/prop-getters-override-contract.test.ts.
 */
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
            // Defaults first so a caller can replace the descriptive ones.
            role: 'region' as const,
            'aria-label': 'Drop files here or click to browse',
            tabIndex: 0,
            ...overrides,
            // Owned: derived from live drag state.
            'aria-dropeffect': isDragging ? 'copy' : 'none',
            // Owned: composed, so the delegation can never be replaced away.
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
        }
    }

    function getRootProps(
        overrides: HTMLAttributes<HTMLElement> = {},
    ): HTMLAttributes<HTMLElement> {
        const isUploading = status === 'uploading'
        return {
            role: 'application' as const,
            'aria-label': 'File uploader',
            ...overrides,
            // Owned: derived from live upload status.
            'aria-busy': isUploading,
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
            tabIndex: -1,
            'aria-hidden': true as const,
            ...overrides,
            // Owned: without type=file the element is not a file picker at all.
            type: 'file' as const,
            // Owned: mirrors the uploader's own `limit` / `allowedFileTypes`, so
            // the picker can't advertise a selection core would then reject.
            // `accept` is only claimed when core actually declares a filter —
            // writing `undefined` unconditionally would delete a caller's own
            // accept, which is the silent-drop bug this contract exists to end.
            multiple,
            ...(allowedFileTypes !== undefined
                ? { accept: allowedFileTypes }
                : {}),
            // Owned: composed, never replaced — an override that swapped this
            // out would leave a file input that adds no files.
            onChange: composeEventHandlers<React.ChangeEvent<HTMLInputElement>>(
                onChange,
                overrides.onChange,
            ),
            // Owned: `display` only. Every other style key a caller passes
            // survives, so positioning/sizing the visually-hidden input works.
            style: { ...overrides.style, display: 'none' as const },
        }
    }

    return { getDropzoneProps, getRootProps, getInputProps }
}
