import { describe, it, expect, vi } from 'vitest'
import { createChildController } from '../../uploader/create-child-controller'

describe('createChildController', () => {
  it('constructs via the factory and exposes the instance', () => {
    const inst = { init: vi.fn(), dispose: vi.fn(), subscribe: vi.fn(() => () => {}) }
    const h = createChildController(() => inst)
    expect(h.controller).toBe(inst)
  })

  it('init() calls instance.init once; dispose() calls instance.dispose once (idempotent)', () => {
    const inst = { init: vi.fn(), dispose: vi.fn() }
    const h = createChildController(() => inst)
    h.init(); h.init()
    expect(inst.init).toHaveBeenCalledTimes(1)
    h.dispose(); h.dispose()
    expect(inst.dispose).toHaveBeenCalledTimes(1)
  })

  it('wires onChange via instance.subscribe and unsubscribes on dispose', () => {
    const unsub = vi.fn()
    const inst = { subscribe: vi.fn(() => unsub) }
    const onChange = vi.fn()
    const h = createChildController(() => inst, { onChange })
    h.init()
    expect(inst.subscribe).toHaveBeenCalledWith(onChange)
    h.dispose()
    expect(unsub).toHaveBeenCalledTimes(1)
  })

  it('tolerates controllers without init/dispose/subscribe', () => {
    const h = createChildController(() => ({}))
    expect(() => { h.init(); h.dispose() }).not.toThrow()
  })
})
