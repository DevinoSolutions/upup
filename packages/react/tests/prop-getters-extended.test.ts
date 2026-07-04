import { describe, it, expect, vi } from 'vitest'
import { createPropGetters } from '../src/prop-getters'

// F-606: getDropzoneProps' onDragOver/onDragLeave/onDrop/onPaste now DELEGATE to a
// DragDropController — the same gate every visual panel already runs — instead of
// re-implementing drag/drop/paste inline (the old inline copy ignored enablePaste,
// never honored the isProcessing PROP gate, skipped filename normalization, and
// bypassed folder handling; see prop-getters-gating.test.ts for those gating pins
// through the real hook, and drag-drop-controller.test.ts for the controller's own
// rules). This file now pins the DELEGATION + event-composition contract at the
// prop-getters layer: each getDropzoneProps handler must call the matching
// dragDrop.handle* method with the (cast) native event, and still compose overrides.
function makeFakeDragDrop(overrides: Partial<Record<'handleDragOver' | 'handleDragLeave' | 'handleDrop' | 'handlePaste', ReturnType<typeof vi.fn>>> = {}) {
    return {
        handleDragOver: vi.fn(),
        handleDragLeave: vi.fn(),
        handleDrop: vi.fn(),
        handlePaste: vi.fn(),
        ...overrides,
    } as any
}

function makeDeps(overrides: Partial<Parameters<typeof createPropGetters>[0]> = {}) {
    return {
        addFiles: vi.fn(),
        status: 'idle',
        allowedFileTypes: undefined as string | undefined,
        multiple: true,
        isDragging: false,
        dragDrop: makeFakeDragDrop(),
        ...overrides,
    }
}

function makeDragEvent(files: File[] = []) {
    return {
        preventDefault: vi.fn(),
        dataTransfer: {
            dropEffect: '',
            files,
        },
    } as any
}

function makeClipboardEvent(items: { kind: string; getAsFile?: () => File | null }[]) {
    return {
        preventDefault: vi.fn(),
        clipboardData: { items },
    } as any
}

// ─────────────────────────────────────────────
// onDragOver
// ─────────────────────────────────────────────
describe('getDropzoneProps — onDragOver', () => {
    it('delegates to dragDrop.handleDragOver with the event', () => {
        const dragDrop = makeFakeDragDrop()
        const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))
        const e = makeDragEvent()
        getDropzoneProps().onDragOver(e)
        expect(dragDrop.handleDragOver).toHaveBeenCalledWith(e)
    })

    it('composes a caller override alongside the delegation', () => {
        const dragDrop = makeFakeDragDrop()
        const override = vi.fn()
        const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))
        const e = makeDragEvent()
        getDropzoneProps({ onDragOver: override }).onDragOver(e)
        expect(dragDrop.handleDragOver).toHaveBeenCalledWith(e)
        expect(override).toHaveBeenCalledWith(e)
    })
})

// ─────────────────────────────────────────────
// onDragLeave
// ─────────────────────────────────────────────
describe('getDropzoneProps — onDragLeave', () => {
    it('delegates to dragDrop.handleDragLeave with the event', () => {
        const dragDrop = makeFakeDragDrop()
        const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))
        const e = makeDragEvent()
        getDropzoneProps().onDragLeave(e)
        expect(dragDrop.handleDragLeave).toHaveBeenCalledWith(e)
    })
})

// ─────────────────────────────────────────────
// onDrop
// ─────────────────────────────────────────────
describe('getDropzoneProps — onDrop', () => {
    it('delegates to dragDrop.handleDrop with the event', () => {
        const dragDrop = makeFakeDragDrop()
        const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))
        const file = new File(['x'], 'test.txt', { type: 'text/plain' })
        const e = makeDragEvent([file])
        getDropzoneProps().onDrop(e)
        expect(dragDrop.handleDrop).toHaveBeenCalledWith(e)
    })
})

// ─────────────────────────────────────────────
// onPaste
// ─────────────────────────────────────────────
describe('getDropzoneProps — onPaste', () => {
    it('delegates to dragDrop.handlePaste with the event', () => {
        const dragDrop = makeFakeDragDrop()
        const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))
        const file = new File(['x'], 'paste.png', { type: 'image/png' })
        const e = makeClipboardEvent([{ kind: 'file', getAsFile: () => file }])
        getDropzoneProps().onPaste(e)
        expect(dragDrop.handlePaste).toHaveBeenCalledWith(e)
    })
})
