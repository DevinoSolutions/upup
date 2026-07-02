import { describe, it, expect, vi } from 'vitest'
import { createChildController } from '../../uploader/create-child-controller'

describe('createChildController', () => {
  it('constructs via the factory and exposes the instance', () => {
    const inst = { init: vi.fn(), destroy: vi.fn(), subscribe: vi.fn(() => () => {}) }
    const h = createChildController(() => inst)
    expect(h.controller).toBe(inst)
  })

  it('init() calls instance.init once; destroy() calls instance.destroy once (idempotent)', () => {
    const inst = { init: vi.fn(), destroy: vi.fn() }
    const h = createChildController(() => inst)
    h.init(); h.init()
    expect(inst.init).toHaveBeenCalledTimes(1)
    h.destroy(); h.destroy()
    expect(inst.destroy).toHaveBeenCalledTimes(1)
  })

  it('wires onChange via instance.subscribe and unsubscribes on destroy', () => {
    const unsub = vi.fn()
    const inst = { subscribe: vi.fn(() => unsub) }
    const onChange = vi.fn()
    const h = createChildController(() => inst, { onChange })
    h.init()
    expect(inst.subscribe).toHaveBeenCalledWith(onChange)
    h.destroy()
    expect(unsub).toHaveBeenCalledTimes(1)
  })

  it('tolerates controllers without init/destroy/subscribe', () => {
    const h = createChildController(() => ({}))
    expect(() => { h.init(); h.destroy() }).not.toThrow()
  })
})
