import { describe, it, expect, vi } from 'vitest'
import type { AdapterPlugin } from '../src/adapters/plugin'
import { EventEmitter } from '../src'

describe('AdapterPlugin interface', () => {
  it('can be implemented and called', () => {
    const emitter = new EventEmitter()
    const mockPlugin: AdapterPlugin = {
      id: 'test-adapter',
      name: 'test-adapter',
      setup: vi.fn(),
      init: vi.fn(),
      destroy: vi.fn(),
    }
    mockPlugin.init(emitter)
    expect(mockPlugin.init).toHaveBeenCalledWith(emitter)
  })
})
