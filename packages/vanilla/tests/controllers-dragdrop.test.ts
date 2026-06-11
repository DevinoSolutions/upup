import { describe, it, expect, vi } from 'vitest'
import { DragDropController } from '../src/controllers/drag-drop'

function makeDeps(over = {}) {
  return {
    core: { emit: vi.fn(), files: new Map() } as any,
    orchestrator: { getSnapshot: () => ({ activeAdapter: undefined, uploadStatus: 'idle', isAddingMore: false }) } as any,
    setFiles: vi.fn(async () => {}),
    options: {},
    props: () => ({ disableDragDrop: false, isProcessing: false, folderUploadAllowDrop: false }),
    invalidate: vi.fn(),
    ...over,
  }
}

describe('DragDropController', () => {
  it('sets isDragging on dragover and clears on dragleave', () => {
    const deps = makeDeps()
    const c = new DragDropController(deps as any)
    const evt = { preventDefault() {}, dataTransfer: { files: [], dropEffect: '' } } as any
    c.handleDragOver(evt)
    expect(c.getSnapshot().isDragging).toBe(true)
    c.handleDragLeave(evt)
    expect(c.getSnapshot().isDragging).toBe(false)
    expect(deps.invalidate).toHaveBeenCalled()
  })
  it('dispose() is safe and resets state', () => {
    const c = new DragDropController(makeDeps() as any)
    c.dispose()
    expect(c.getSnapshot().isDragging).toBe(false)
  })
  it('handlePaste renames image.png, calls preventDefault, gates on enablePaste', () => {
    const setFiles = vi.fn(async () => {})
    // enablePaste off → no-op
    const off = new DragDropController(makeDeps({ setFiles, options: { enablePaste: false } }) as any)
    const prevent1 = vi.fn()
    off.handlePaste({ preventDefault: prevent1, clipboardData: { items: [] } } as any)
    expect(setFiles).not.toHaveBeenCalled()
    expect(prevent1).not.toHaveBeenCalled()
    // enablePaste on → screenshot renamed pasted-*.png, preventDefault called
    const on = new DragDropController(makeDeps({ setFiles, options: { enablePaste: true } }) as any)
    const blob = new File(['x'], 'image.png', { type: 'image/png' })
    const prevent2 = vi.fn()
    on.handlePaste({
      preventDefault: prevent2,
      clipboardData: { items: [{ kind: 'file', getAsFile: () => blob }] },
    } as any)
    expect(prevent2).toHaveBeenCalled()
    expect(setFiles).toHaveBeenCalledTimes(1)
    const passed = setFiles.mock.calls[0][0] as File[]
    expect(passed).toHaveLength(1)
    expect(passed[0].name).toMatch(/^pasted-\d+\.png$/)
  })
})
