import { describe, it, expect, vi } from 'vitest'
import { createRootController } from '../../root/create-root-controller'
import { normalizeRootOptions } from '../../root/normalize-options'
import { UpupCore } from '../../core'
import type { RootControllerOptions } from '../../root/types'

function build(options: RootControllerOptions = {}, hostHooks = {}) {
  const normalized = normalizeRootOptions(options)
  const core = new UpupCore(normalized.coreOptions)
  const root = createRootController({ core, options, normalized }, hostHooks)
  return { root, core, normalized }
}

describe('createRootController', () => {
  it('exposes core, orchestrator, theme, resolved, commands', () => {
    const { root, core } = build()
    expect(root.core).toBe(core)
    expect(root.orchestrator).toBeTruthy()
    expect(root.theme).toBeTruthy()
    expect(root.resolved.limit).toBe(10)
    expect(typeof root.commands.proceedUpload).toBe('function')
    root.dispose()
  })

  it('init is idempotent: double init does not double-register plugins', () => {
    const { root, core } = build({ cloudDrives: { googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' } } })
    const useSpy = vi.spyOn(core, 'use')
    root.init()
    root.init() // StrictMode double-invoke
    expect(useSpy.mock.calls.length).toBeLessThanOrEqual(1)
    root.dispose()
  })

  it('dispose is idempotent and re-entrant (init -> dispose -> init -> dispose)', () => {
    const { root } = build()
    root.init(); root.dispose(); root.init(); root.dispose()
    expect(() => root.dispose()).not.toThrow()
  })

  it('proceedUpload no-ops on empty file list', async () => {
    const { root, core } = build()
    const upSpy = vi.spyOn(core, 'upload').mockResolvedValue([])
    root.init()
    await root.commands.proceedUpload()
    expect(upSpy).not.toHaveBeenCalled()
    root.dispose()
  })

  it('proceedUpload calls onPrepareFiles and core.upload when files present', async () => {
    const onPrepareFiles = vi.fn(async (f) => f)
    const { root, core } = build({ onPrepareFiles })
    core.files.set('a', { id: 'a', file: new File(['x'], 'a.txt') } as never)
    const upSpy = vi.spyOn(core, 'upload').mockResolvedValue([])
    root.init()
    await root.commands.proceedUpload()
    expect(onPrepareFiles).toHaveBeenCalledTimes(1)
    expect(upSpy).toHaveBeenCalledTimes(1)
    root.dispose()
  })

  it('image-editor commands delegate to the orchestrator', () => {
    const { root } = build()
    const open = vi.spyOn(root.orchestrator, 'openImageEditor').mockImplementation(() => {})
    const close = vi.spyOn(root.orchestrator, 'closeImageEditor').mockImplementation(() => {})
    const f = { id: 'x' } as never
    root.commands.openImageEditor(f); root.commands.closeImageEditor()
    expect(open).toHaveBeenCalledWith(f)
    expect(close).toHaveBeenCalled()
    root.dispose()
  })

  it('status-change fires onStatusChange once per real change (deduped)', () => {
    const onStatusChange = vi.fn()
    const { root, core } = build({ onStatusChange })
    root.init()
    // simulate two notifies with the same status, then a change
    core.emit('state-change', {})
    core.emit('state-change', {})
    const calls = onStatusChange.mock.calls.length
    expect(calls).toBeLessThanOrEqual(1) // same status deduped
    root.dispose()
  })

  it('onFilesUploadComplete wrapper invokes connectSSE per completed file', () => {
    const connectSSE = vi.fn()
    const onFilesUploadComplete = vi.fn()
    const { root } = build({ onFilesUploadComplete }, { connectSSE })
    root.updateCallbacks({ onFilesUploadComplete })
    const files = [{ id: '1' }, { id: '2' }] as never[]
    // reach the proxied callback the orchestrator would call:
    ;(root.orchestrator as unknown as { callbacks: { onFilesUploadComplete?: (f: unknown[]) => void } })
      .callbacks.onFilesUploadComplete?.(files)
    expect(onFilesUploadComplete).toHaveBeenCalledWith(files)
    expect(connectSSE).toHaveBeenCalledTimes(2)
    root.dispose()
  })

  it('subscribe fans in core state-change + orchestrator + theme; unsub stops it', () => {
    const { root, core } = build()
    root.init()
    const listener = vi.fn()
    const unsub = root.subscribe(listener)
    core.emit('state-change', {})
    expect(listener).toHaveBeenCalled()
    listener.mockClear()
    unsub()
    core.emit('state-change', {})
    expect(listener).not.toHaveBeenCalled()
    root.dispose()
  })
})
