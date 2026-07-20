import { html, nothing, type TemplateResult } from 'lit-html'
import type { UploadFile } from '@upupjs/core'
import {
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    fileCanPreviewText,
    cn,
} from '@upupjs/core/internal'
import type { UploaderContext } from '../lib/types'
import { filePreview } from './file-preview'
import { filePreviewPortal, type TextState } from './file-preview-portal'
import { fileRow } from './file-row'

export interface FileItemState {
    canPreview: boolean
    showPreviewPortal: boolean
    textState?: TextState
    /** Escape-close listener (F-605), stored here — not a local closure — because
     *  fileItem() reruns every ctx.invalidate(), so a local reference would be lost
     *  between the add in openPortal and the remove in closePortal. */
    escHandler?: ((e: KeyboardEvent) => void) | undefined
}
const stateMap = new WeakMap<UploadFile, FileItemState>()
function computeEagerCanPreview(file: UploadFile): boolean {
    const type = file.type
    const name = file.name
    return (
        fileGetIsImage(type) ||
        fileGetIsPdf(type, name) ||
        (fileGetIsText(type, name) && fileCanPreviewText(type, name, file.size))
    )
}
function stateFor(file: UploadFile): FileItemState {
    let s = stateMap.get(file)
    if (!s) {
        s = {
            canPreview: computeEagerCanPreview(file),
            showPreviewPortal: false,
        }
        stateMap.set(file, s)
    }
    return s
}

export function fileItem(
    ctx: UploaderContext,
    file: UploadFile,
    index = 0,
    forcedList = false,
): TemplateResult {
    const state = stateFor(file)
    const slot = ctx.theme.getSnapshot().slotOverrides
    const filesSize = ctx.core.files.size
    const viewMode = ctx.orchestrator.getSnapshot().viewMode
    const leaving = ctx.getTransientUi().leavingFileIds.has(file.id)

    const openPortal = () => {
        state.showPreviewPortal = true
        ctx.core.emit('file-preview-open', {
            fileId: file.id,
            fileName: file.name,
        })
        // Window-level (not dialog-scoped): the modal opens from this button click,
        // which never moves focus into the portal, so a dialog-scoped keydown would
        // never receive Escape (F-605). Mirrors the react/vue/svelte canon.
        state.escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePortal()
        }
        window.addEventListener('keydown', state.escHandler)
        ctx.invalidate()
    }
    const closePortal = () => {
        state.showPreviewPortal = false
        ctx.core.emit('file-preview-close', {
            fileId: file.id,
            fileName: file.name,
        })
        if (state.escHandler) {
            window.removeEventListener('keydown', state.escHandler)
            state.escHandler = undefined
        }
        ctx.invalidate()
    }
    const stop = (e: MouseEvent) => {
        e.stopPropagation()
    }

    const useRow = viewMode === 'list' || forcedList

    return html` <div
        data-testid="upup-file-item"
        data-upup-slot="file-item"
        role="listitem"
        class=${cn(
            'upup-animate-fx-enter',
            'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
            leaving && 'upup-animate-fx-exit upup-overflow-hidden',
            {
                [slot.fileItemMultiple ?? '']:
                    !!slot.fileItemMultiple && filesSize > 1,
                [slot.fileItemSingle ?? '']:
                    !!slot.fileItemSingle && filesSize === 1,
            },
        )}
        style=${leaving ? nothing : `animation-delay: ${Math.min(index, 8) * 40}ms`}
    >
        ${
            useRow
                ? fileRow(ctx, file, index)
                : html`${filePreview(ctx, file, state, {
                      onRequestPreview: openPortal,
                      index,
                  })}
                  ${
                      state.canPreview && state.showPreviewPortal
                          ? filePreviewPortal(ctx, {
                                fileType: file.type,
                                fileUrl: file.url ?? '',
                                fileName: file.name,
                                fileSize: file.size,
                                onClose: closePortal,
                                onStopPropagation: stop,
                                cell: state,
                            })
                          : nothing
                  }`
        }
    </div>`
}
