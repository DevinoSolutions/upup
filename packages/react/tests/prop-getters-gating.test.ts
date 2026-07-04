import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

// F-606 — the headless getDropzoneProps().onPaste/onDrop re-implemented drag/drop/
// paste inline, diverging from core's DragDropController that every visual panel
// already routes through: it ignored enablePaste (always pasted), never honored the
// isProcessing PROP gate, skipped the pasted-<ts> filename normalization, and bypassed
// collectDroppedFiles' folder handling. This pins the gated (correct) behavior —
// wiring the headless hook through the SAME controller closes all four divergences
// at once.

function makeClipboardEvent(name: string, type = 'image/png') {
    const file = new File(['x'], name, { type })
    return {
        preventDefault: () => {},
        clipboardData: { items: [{ kind: 'file', getAsFile: () => file }] },
    } as unknown as React.ClipboardEvent<HTMLElement>
}

function makeDragEvent(files: File[]) {
    return {
        preventDefault: () => {},
        dataTransfer: { dropEffect: '', files, items: files.map((f) => ({ kind: 'file', webkitGetAsEntry: () => null, getAsFile: () => f })) },
    } as unknown as React.DragEvent<HTMLElement>
}

/** A dropped folder: one DataTransferItem whose webkitGetAsEntry() resolves to a
 *  directory entry, per folder-drop.ts's traverseWebkitEntry contract. */
function makeFolderDragEvent() {
    const directoryEntry = { isFile: false, isDirectory: true }
    return {
        preventDefault: () => {},
        dataTransfer: {
            dropEffect: '',
            files: [] as unknown as FileList,
            items: [{ kind: 'file', webkitGetAsEntry: () => directoryEntry }],
        },
    } as unknown as React.DragEvent<HTMLElement>
}

describe('useUpupUpload — headless prop-getter gating (F-606)', () => {
    it('does NOT add a pasted file when enablePaste is false (default)', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            result.current.getDropzoneProps().onPaste(makeClipboardEvent('image.png'))
        })
        expect(result.current.files.length).toBe(0)
    })

    it('DOES add a pasted file when enablePaste is true, normalizing image.png -> pasted-<ts>.<ext>', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const, enablePaste: true }))
        await act(async () => {
            result.current.getDropzoneProps().onPaste(makeClipboardEvent('image.png'))
        })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toMatch(/^pasted-\d+\.png$/)
    })

    it('preserves a non-default filename when pasted (enablePaste:true)', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const, enablePaste: true }))
        await act(async () => {
            result.current.getDropzoneProps().onPaste(makeClipboardEvent('screenshot.png'))
        })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toBe('screenshot.png')
    })

    it('blocks paste when isProcessing is true, even with enablePaste:true', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, enablePaste: true, isProcessing: true }),
        )
        await act(async () => {
            result.current.getDropzoneProps().onPaste(makeClipboardEvent('image.png'))
        })
        expect(result.current.files.length).toBe(0)
    })

    it('blocks drop when isProcessing is true', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const, isProcessing: true }))
        const file = new File(['x'], 'dropped.txt', { type: 'text/plain' })
        await act(async () => {
            await result.current.getDropzoneProps().onDrop(makeDragEvent([file]))
        })
        expect(result.current.files.length).toBe(0)
    })

    it('adds dropped files when not processing/disabled', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        const file = new File(['x'], 'dropped.txt', { type: 'text/plain' })
        await act(async () => {
            await result.current.getDropzoneProps().onDrop(makeDragEvent([file]))
        })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toBe('dropped.txt')
    })

    it('emits folder-drop-blocked and adds no files when folderUploadAllowDrop is false (default) and a folder is dropped', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        let blocked: unknown
        act(() => {
            result.current.on('folder-drop-blocked', (payload) => { blocked = payload })
        })
        await act(async () => {
            await result.current.getDropzoneProps().onDrop(makeFolderDragEvent())
        })
        expect(blocked).toEqual({ acceptedFiles: 0 })
        expect(result.current.files.length).toBe(0)
    })

    it('does NOT block folder drop when folderUpload.allowDrop is true', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, folderUpload: { allowDrop: true } }),
        )
        let blocked = false
        act(() => {
            result.current.on('folder-drop-blocked', () => { blocked = true })
        })
        // A directory entry with no createReader() (nothing to traverse) — proves
        // the gate itself (allowFolderDrop=true -> collectDroppedFiles does NOT set
        // skippedDirectory), independent of whatever traversal a real FS would do.
        const directoryEntry = { isFile: false, isDirectory: true, createReader: undefined }
        const dragEvent = {
            preventDefault: () => {},
            dataTransfer: {
                dropEffect: '',
                files: [] as unknown as FileList,
                items: [{ kind: 'file', webkitGetAsEntry: () => directoryEntry }],
            },
        } as unknown as React.DragEvent<HTMLElement>
        await act(async () => {
            await result.current.getDropzoneProps().onDrop(dragEvent)
        })
        expect(blocked).toBe(false)
    })
})
