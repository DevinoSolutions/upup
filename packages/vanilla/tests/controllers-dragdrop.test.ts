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
})
