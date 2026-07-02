import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DragDropController, type DragDropDeps } from '../../controllers/drag-drop-controller'
import { UploadStatus } from '../../types/upload-status'

function makeOrchestrator(initial: any) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => state,
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l) },
    _set(p: any) { state = { ...state, ...p }; listeners.forEach(f => f()) },
  }
}

function makeDeps(over: Partial<any> = {}): { deps: DragDropDeps; orch: any; core: any; setFiles: any } {
  const orch = makeOrchestrator({
    activeSource: undefined, uploadStatus: UploadStatus.IDLE,
    isAddingMore: false, files: new Map(),
  })
  const core = { files: new Map<string, unknown>(), emit: vi.fn() }
  const setFiles = vi.fn()
  const deps: DragDropDeps = {
    core: core as any,
    orchestrator: orch as any,
    setFiles,
    // Vanilla-style source: the file count tracks core.files directly. The
    // React-style (orchestrator-snapshot) source is exercised explicitly below.
    filesSize: () => core.files.size,
    options: () => ({ enablePaste: true, onFilesDragOver: vi.fn(), onFilesDragLeave: vi.fn(), onFilesDrop: vi.fn(), onWarn: vi.fn(), ...(over.options ?? {}) }),
    props: () => ({ disableDragDrop: false, isProcessing: false, folderUploadAllowDrop: false, ...(over.props ?? {}) }),
  }
  return { deps, orch, core, setFiles }
}

function dragEvent(files: File[] = []): any {
  return { preventDefault: vi.fn(), dataTransfer: { files, dropEffect: '', items: [] } }
}

describe('DragDropController', () => {
  it('getSnapshot returns a stable reference until state changes', () => {
    const { deps } = makeDeps()
    const c = new DragDropController(deps)
    const a = c.getSnapshot()
    expect(c.getSnapshot()).toBe(a)            // same ref, no change
    c.handleDragOver(dragEvent())
    const b = c.getSnapshot()
    expect(b).not.toBe(a)                       // changed → new ref
    expect(b.isDragging).toBe(true)
  })

  it('handleDragOver sets dropEffect, fires callbacks/emit, notifies', () => {
    const { deps, core } = makeDeps()
    const c = new DragDropController(deps)
    const listener = vi.fn()
    c.subscribe(listener)
    const e = dragEvent()
    c.handleDragOver(e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(e.dataTransfer.dropEffect).toBe('copy')
    expect(core.emit).toHaveBeenCalledWith('drag-over', {})
    expect(listener).toHaveBeenCalled()
  })

  it('is a no-op when disabled (disableDragDrop)', () => {
    const { deps, core } = makeDeps({ props: { disableDragDrop: true } })
    const c = new DragDropController(deps)
    c.handleDragOver(dragEvent())
    expect(c.getSnapshot().isDragging).toBe(false)
    expect(core.emit).not.toHaveBeenCalled()
  })

  it('is a no-op when an adapter is active or an upload is in progress', () => {
    const { deps, orch, core } = makeDeps()
    const c = new DragDropController(deps)
    orch._set({ activeSource: 'GOOGLE_DRIVE' })
    c.handleDragOver(dragEvent())
    expect(core.emit).not.toHaveBeenCalled()
    orch._set({ activeSource: undefined, uploadStatus: UploadStatus.UPLOADING })
    c.handleDragOver(dragEvent())
    expect(core.emit).not.toHaveBeenCalled()
  })

  it('handleDrop routes dropped files to setFiles + emits drop', async () => {
    const { deps, setFiles, core } = makeDeps()
    const c = new DragDropController(deps)
    const f = new File(['x'], 'a.txt', { type: 'text/plain' })
    await c.handleDrop(dragEvent([f]))
    expect(setFiles).toHaveBeenCalledTimes(1)
    expect(core.emit).toHaveBeenCalledWith('drop', expect.anything())
    expect(c.getSnapshot().isDragging).toBe(false)
  })

  it('handlePaste renames image.png / nameless clipboard files', () => {
    const { deps, setFiles } = makeDeps()
    const c = new DragDropController(deps)
    const png = new File(['x'], 'image.png', { type: 'image/png' })
    const e: any = {
      preventDefault: vi.fn(),
      clipboardData: { items: [{ kind: 'file', getAsFile: () => png }] },
    }
    c.handlePaste(e)
    expect(setFiles).toHaveBeenCalledTimes(1)
    const passed = setFiles.mock.calls[0][0][0] as File
    expect(passed.name).toMatch(/^pasted-\d+\.png$/)
  })

  it('handlePaste is a no-op when enablePaste is false', () => {
    const { deps, setFiles } = makeDeps({ options: { enablePaste: false } })
    const c = new DragDropController(deps)
    const e: any = { preventDefault: vi.fn(), clipboardData: { items: [{ kind: 'file', getAsFile: () => new File(['x'], 'image.png', { type: 'image/png' }) }] } }
    c.handlePaste(e)
    expect(setFiles).not.toHaveBeenCalled()
  })

  it('snapshot reflects orchestrator: active adapter clears absoluteIsDragging', () => {
    const { deps, orch } = makeDeps()
    const c = new DragDropController(deps)
    c.init()
    c.handleDragOver(dragEvent())
    expect(c.getSnapshot().absoluteIsDragging).toBe(true)
    orch._set({ activeSource: 'GOOGLE_DRIVE' })
    expect(c.getSnapshot().absoluteIsDragging).toBe(false)
  })

  it('destroy unsubscribes from the orchestrator and clears listeners', () => {
    const { deps, orch } = makeDeps()
    const c = new DragDropController(deps)
    c.init()
    const listener = vi.fn()
    c.subscribe(listener)
    c.destroy()
    orch._set({ isAddingMore: true })   // would recompute+notify if still subscribed
    expect(listener).not.toHaveBeenCalled()
  })

  it('absoluteHasBorder follows the filesSize getter and recovers on orchestrator notify (React-style)', () => {
    // React/Vue/Svelte/Angular derive the file count from the orchestrator
    // snapshot (their list source), NOT core.files. Removal flips the snapshot
    // count and notifies; the border must recover. Regression: reading
    // core.files.size left the border stuck after removing the last file because
    // orchestrator.removeFile setState()s (notify) *before* core.removeFile runs.
    const { deps, orch } = makeDeps()
    deps.filesSize = () => orch.getSnapshot().files.size
    const c = new DragDropController(deps)
    c.init()
    expect(c.getSnapshot().absoluteHasBorder).toBe(true)          // empty → border
    orch._set({ files: new Map([['a', {}]]) })                    // add → notify
    expect(c.getSnapshot().absoluteHasBorder).toBe(false)         // a file present → no border
    orch._set({ files: new Map() })                              // remove last → notify
    expect(c.getSnapshot().absoluteHasBorder).toBe(true)          // border recovers
  })

  it('recompute() refreshes the cached snapshot after a core-only file change (no orchestrator notify)', () => {
    const { deps, core } = makeDeps()
    const c = new DragDropController(deps)
    c.init()
    // Empty + no active adapter → empty-state border shown.
    expect(c.getSnapshot().absoluteHasBorder).toBe(true)
    // A framework mutates core.files directly (e.g. vanilla core.removeFile) with no
    // orchestrator notify — the cached snapshot stays stale until recompute() runs.
    core.files.set('a', {})
    expect(c.getSnapshot().absoluteHasBorder).toBe(true) // still stale (cached)
    c.recompute()
    expect(c.getSnapshot().absoluteHasBorder).toBe(false) // fresh: a file is present → no border
    // Removing the last file directly: recompute() restores the empty-state border.
    core.files.delete('a')
    c.recompute()
    expect(c.getSnapshot().absoluteHasBorder).toBe(true)
  })
})
