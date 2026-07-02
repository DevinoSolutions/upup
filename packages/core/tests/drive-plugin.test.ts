import { describe, it, expect, vi } from 'vitest'
import type { DrivePlugin } from '../src/drives/plugin'
import { EventEmitter } from '../src'

describe('DrivePlugin interface', () => {
  it('can be implemented and called', () => {
    const emitter = new EventEmitter()
    const mockPlugin: DrivePlugin = {
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
