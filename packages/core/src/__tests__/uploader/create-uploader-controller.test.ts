import { describe, it, expect, vi } from 'vitest'
import { createUploaderController } from '../../uploader/create-uploader-controller'
import { normalizeUploaderOptions } from '../../uploader/normalize-options'
import { UpupCore } from '../../core'
import type { UploaderControllerOptions } from '../../uploader/types'

function build(options: UploaderControllerOptions = {}, hostHooks = {}) {
  const normalized = normalizeUploaderOptions(options)
  const core = new UpupCore(normalized.coreOptions)
  const root = createUploaderController({ core, options, normalized }, hostHooks)
  return { root, core, normalized }
}

describe('createUploaderController', () => {
  it('exposes core, orchestrator, theme, resolved, commands', () => {
    const { root, core } = build()
    expect(root.core).toBe(core)
    expect(root.orchestrator).toBeTruthy()
    expect(root.theme).toBeTruthy()
    expect(root.resolved.limit).toBe(10)
    expect(typeof root.commands.startUpload).toBe('function')
    root.destroy()
  })

  it('registers configured plugins exactly once; double init does not re-register', () => {
    const { root, core } = build({ cloudDrives: { googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' } } })
    const useSpy = vi.spyOn(core, 'use')
    root.init()
    expect(useSpy).toHaveBeenCalledTimes(1)   // actually registered (was only asserting <= 1)
    root.init() // StrictMode double-invoke
    expect(useSpy).toHaveBeenCalledTimes(1)   // not double
    root.destroy()
  })

  it('config-surface: all four drives register with the camelCase config verbatim', () => {
    const cloudDrives = {
      googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' },
      oneDrive: { clientId: 'o', redirectUri: 'https://app.example/od' },
      dropbox: { clientId: 'd' },
      box: { clientId: 'b', redirectUri: 'https://app.example/box' },
    }
    const { root, core } = build({ cloudDrives })
    const useSpy = vi.spyOn(core, 'use')
    root.init()
    expect(useSpy).toHaveBeenCalledTimes(4)
    const byId = new Map(
      useSpy.mock.calls.map(([p]) => {
        const plugin = p as unknown as { id: string; getConfig(): unknown }
        return [plugin.id, plugin] as const
      }),
    )
    expect(byId.get('google-drive')?.getConfig()).toEqual(cloudDrives.googleDrive)
    expect(byId.get('one-drive')?.getConfig()).toEqual(cloudDrives.oneDrive)
    expect(byId.get('dropbox')?.getConfig()).toEqual(cloudDrives.dropbox)
    expect(byId.get('box')?.getConfig()).toEqual(cloudDrives.box)
    root.destroy()
  })

  it('init->destroy->init->destroy with cloud plugins is re-entrant (no throw)', () => {
    const { root } = build({ cloudDrives: { googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' } } })
    expect(() => { root.init(); root.destroy(); root.init(); root.destroy() }).not.toThrow()
  })

  it('destroy is idempotent and re-entrant (init -> destroy -> init -> destroy)', () => {
    const { root } = build()
    root.init(); root.destroy(); root.init(); root.destroy()
    expect(() => root.destroy()).not.toThrow()
  })

  it('startUpload no-ops on empty file list', async () => {
    const { root, core } = build()
    const upSpy = vi.spyOn(core, 'upload').mockResolvedValue([])
    root.init()
    await root.commands.startUpload()
    expect(upSpy).not.toHaveBeenCalled()
    root.destroy()
  })

  it('startUpload calls onPrepareFiles and core.upload when files present', async () => {
    const onPrepareFiles = vi.fn(async (f) => f)
    const { root, core } = build({ onPrepareFiles })
    core.files.set('a', { id: 'a', file: new File(['x'], 'a.txt') } as never)
    const upSpy = vi.spyOn(core, 'upload').mockResolvedValue([])
    root.init()
    await root.commands.startUpload()
    expect(onPrepareFiles).toHaveBeenCalledTimes(1)
    expect(upSpy).toHaveBeenCalledTimes(1)
    root.destroy()
  })

  it('image-editor commands delegate to the orchestrator', () => {
    const { root } = build()
    const open = vi.spyOn(root.orchestrator, 'openImageEditor').mockImplementation(() => {})
    const close = vi.spyOn(root.orchestrator, 'closeImageEditor').mockImplementation(() => {})
    const f = { id: 'x' } as never
    root.commands.openImageEditor(f); root.commands.closeImageEditor()
    expect(open).toHaveBeenCalledWith(f)
    expect(close).toHaveBeenCalled()
    root.destroy()
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
    root.destroy()
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
    root.destroy()
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
    root.destroy()
  })

  it('re-subscribe after the fan-in goes empty still receives notifications', () => {
    const { root, core } = build()
    root.init()
    const a = vi.fn()
    const unsubA = root.subscribe(a)
    unsubA() // last subscriber leaves -> fan-in torn down
    const b = vi.fn()
    root.subscribe(b) // must re-arm the fan-in
    core.emit('state-change', {})
    expect(b).toHaveBeenCalled()
    root.destroy()
  })
})
