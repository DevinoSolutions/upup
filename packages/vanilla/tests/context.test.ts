import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileSource } from '@upup/core'
import { buildRootContext } from '../src/context'

beforeEach(() => { document.body.innerHTML = '' })

describe('buildRootContext', () => {
  it('builds a context with core, orchestrator, theme and resolved props', () => {
    const onError = vi.fn()
    const { ctx, dispose } = buildRootContext(
      { sources: ['local'], maxFiles: 3, allowedFileTypes: 'image/*', onError },
      () => {},
    )
    expect(ctx.core).toBeTruthy()
    expect(ctx.orchestrator).toBeTruthy()
    expect(ctx.theme).toBeTruthy()
    expect(ctx.props.limit).toBe(3)
    expect(ctx.props.sources).toContain(FileSource.LOCAL)
    expect(ctx.mode).toBe('client')
    expect(typeof ctx.setActiveAdapter).toBe('function')
    dispose()
  })

  it('resolves server mode when serverUrl is set without uploadEndpoint', () => {
    const { ctx, dispose } = buildRootContext({ serverUrl: 'http://localhost:53060' }, () => {})
    expect(ctx.mode).toBe('server')
    expect(ctx.serverUrl).toBe('http://localhost:53060')
    dispose()
  })

  it('wires convenience onFileAdded to the core files-added event', () => {
    const onFileAdded = vi.fn()
    const { ctx, dispose } = buildRootContext({ onFileAdded }, () => {})
    ctx.core.emit('files-added', [])
    expect(onFileAdded).toHaveBeenCalled()
    dispose()
  })

  it('routes ctx.setFiles through core.addFiles so files-added fires (autoUpload parity with svelte/react)', async () => {
    const { ctx, dispose } = buildRootContext({ sources: ['local'] }, () => {})
    const filesAdded = vi.fn()
    ctx.core.on('files-added', filesAdded)
    await ctx.setFiles([new File(['x'], 'a.txt', { type: 'text/plain' })])
    expect(filesAdded).toHaveBeenCalledTimes(1)
    expect(ctx.core.files.size).toBe(1)
    dispose()
  })
})
