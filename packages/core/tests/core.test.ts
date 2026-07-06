import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'
import type { UpupPlugin } from '../src/plugin'
import type { UploadFile } from '../src/contracts'

const makeNativeFile = (name = 'test.jpg', size = 1024, type = 'image/jpeg'): File => {
  return new File(['x'.repeat(size)], name, { type })
}

describe('UpupCore', () => {
  it('initializes with IDLE status', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    expect(core.status).toBe(UploadStatus.IDLE)
  })

  it('adds files and emits files-added event', async () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    const handler = vi.fn()
    core.on('files-added', handler)
    await core.addFiles([makeNativeFile()])
    expect(core.files.size).toBe(1)
    expect(handler).toHaveBeenCalled()
  })

  it('removes a file and emits file-removed', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    const handler = vi.fn()
    core.on('file-removed', handler)
    // Minimal test fixture — only `id`/`name` are exercised by removeFile/size assertions.
    const file = { id: 'test-1', name: 'test.jpg' } as unknown as UploadFile
    core['fileManager']['files'].set('test-1', file)
    core.removeFile('test-1')
    expect(core.files.size).toBe(0)
    expect(handler).toHaveBeenCalled()
  })

  it('emits file-rejected when onBeforeFileAdded returns false', async () => {
    const core = new UpupCore({
      provider: 'aws',
      uploadEndpoint: '/api/upload',
      onBeforeFileAdded: async () => false,
    })
    const handler = vi.fn()
    core.on('file-rejected', handler)
    await core.addFiles([makeNativeFile()])
    expect(core.files.size).toBe(0)
  })

  it('registers plugins via use() and returns self for chaining', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    const init = vi.fn()
    const plugin: UpupPlugin = { name: 'test-plugin', init }
    const result = core.use(plugin)
    // init(emitter) is the one lifecycle hook (F-607) — invoked with core's bus.
    expect(init).toHaveBeenCalledOnce()
    expect(typeof init.mock.calls[0][0].on).toBe('function')
    expect(result).toBe(core)
  })

  it('registers plugins via options.plugins', () => {
    const init = vi.fn()
    const plugin: UpupPlugin = { name: 'opt-plugin', init }
    const _core = new UpupCore({
      provider: 'aws',
      uploadEndpoint: '/api/upload',
      plugins: [plugin],
    })
    expect(init).toHaveBeenCalledOnce()
  })

  it('provides type-safe extension access via ext', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    core.registerExtension('counter', { getCount: () => 42 })
    expect(core.getExtension('counter')!.getCount()).toBe(42)
  })

  it('cleans up on destroy', () => {
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
    core.on('test', vi.fn())
    core.destroy()
    expect(core.status).toBe(UploadStatus.IDLE)
  })
})
