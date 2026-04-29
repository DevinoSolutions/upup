import { describe, it, expect, vi } from 'vitest'
import { createPropGetters } from '../src/prop-getters'

function makeDeps(overrides: Partial<Parameters<typeof createPropGetters>[0]> = {}) {
    return {
        addFiles: vi.fn(),
        status: 'idle',
        allowedFileTypes: undefined as string | undefined,
        multiple: true,
        isDragging: false,
        setIsDragging: vi.fn(),
        disableDragAction: false,
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
    it('calls setIsDragging(true) when enabled', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        getDropzoneProps().onDragOver(makeDragEvent())
        expect(deps.setIsDragging).toHaveBeenCalledWith(true)
    })

    it('calls preventDefault when enabled', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const e = makeDragEvent()
        getDropzoneProps().onDragOver(e)
        expect(e.preventDefault).toHaveBeenCalled()
    })

    it('does not call setIsDragging when disabled', () => {
        const deps = makeDeps({ disableDragAction: true })
        const { getDropzoneProps } = createPropGetters(deps)
        getDropzoneProps().onDragOver(makeDragEvent())
        expect(deps.setIsDragging).not.toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────
// onDragLeave
// ─────────────────────────────────────────────
describe('getDropzoneProps — onDragLeave', () => {
    it('calls setIsDragging(false) when enabled', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        getDropzoneProps().onDragLeave(makeDragEvent())
        expect(deps.setIsDragging).toHaveBeenCalledWith(false)
    })

    it('calls preventDefault when enabled', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const e = makeDragEvent()
        getDropzoneProps().onDragLeave(e)
        expect(e.preventDefault).toHaveBeenCalled()
    })

    it('does not call setIsDragging when disabled', () => {
        const deps = makeDeps({ disableDragAction: true })
        const { getDropzoneProps } = createPropGetters(deps)
        getDropzoneProps().onDragLeave(makeDragEvent())
        expect(deps.setIsDragging).not.toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────
// onDrop
// ─────────────────────────────────────────────
describe('getDropzoneProps — onDrop', () => {
    it('calls addFiles with dropped files', async () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const file = new File(['x'], 'test.txt', { type: 'text/plain' })
        const e = makeDragEvent([file])
        await getDropzoneProps().onDrop(e)
        expect(deps.addFiles).toHaveBeenCalledWith([file])
    })

    it('calls preventDefault on drop', async () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const e = makeDragEvent()
        await getDropzoneProps().onDrop(e)
        expect(e.preventDefault).toHaveBeenCalled()
    })

    it('calls setIsDragging(false) after drop', async () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        await getDropzoneProps().onDrop(makeDragEvent())
        expect(deps.setIsDragging).toHaveBeenCalledWith(false)
    })

    it('does not call addFiles when disabled', async () => {
        const deps = makeDeps({ disableDragAction: true })
        const { getDropzoneProps } = createPropGetters(deps)
        const file = new File(['x'], 'test.txt')
        await getDropzoneProps().onDrop(makeDragEvent([file]))
        expect(deps.addFiles).not.toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────
// onPaste
// ─────────────────────────────────────────────
describe('getDropzoneProps — onPaste', () => {
    it('calls addFiles with pasted file items', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const file = new File(['x'], 'paste.png', { type: 'image/png' })
        const e = makeClipboardEvent([{ kind: 'file', getAsFile: () => file }])
        getDropzoneProps().onPaste(e)
        expect(deps.addFiles).toHaveBeenCalledWith([file])
    })

    it('calls preventDefault when files are pasted', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const file = new File(['x'], 'paste.png')
        const e = makeClipboardEvent([{ kind: 'file', getAsFile: () => file }])
        getDropzoneProps().onPaste(e)
        expect(e.preventDefault).toHaveBeenCalled()
    })

    it('ignores non-file clipboard items', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const e = makeClipboardEvent([{ kind: 'string' }])
        getDropzoneProps().onPaste(e)
        expect(deps.addFiles).not.toHaveBeenCalled()
    })

    it('does not call addFiles when disabled', () => {
        const deps = makeDeps({ disableDragAction: true })
        const { getDropzoneProps } = createPropGetters(deps)
        const file = new File(['x'], 'paste.png')
        const e = makeClipboardEvent([{ kind: 'file', getAsFile: () => file }])
        getDropzoneProps().onPaste(e)
        expect(deps.addFiles).not.toHaveBeenCalled()
    })

    it('filters out null getAsFile results', () => {
        const deps = makeDeps()
        const { getDropzoneProps } = createPropGetters(deps)
        const e = makeClipboardEvent([{ kind: 'file', getAsFile: () => null }])
        getDropzoneProps().onPaste(e)
        expect(deps.addFiles).not.toHaveBeenCalled()
    })
})
