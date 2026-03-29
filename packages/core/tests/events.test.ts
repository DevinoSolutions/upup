import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/events'

describe('EventEmitter', () => {
  it('calls registered handler when event is emitted', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()

    emitter.on('test', handler)
    emitter.emit('test', 'arg1', 'arg2')

    expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('returns an unsubscribe function from on()', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()

    const unsub = emitter.on('test', handler)
    unsub()
    emitter.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('removes a handler with off()', () => {
    const emitter = new EventEmitter()
    const handler = vi.fn()

    emitter.on('test', handler)
    emitter.off('test', handler)
    emitter.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('supports multiple handlers for the same event', () => {
    const emitter = new EventEmitter()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    emitter.on('test', handler1)
    emitter.on('test', handler2)
    emitter.emit('test', 'data')

    expect(handler1).toHaveBeenCalledWith('data')
    expect(handler2).toHaveBeenCalledWith('data')
  })

  it('does not throw when emitting with no handlers', () => {
    const emitter = new EventEmitter()
    expect(() => emitter.emit('test')).not.toThrow()
  })

  it('does not throw when off() is called for unregistered handler', () => {
    const emitter = new EventEmitter()
    expect(() => emitter.off('test', vi.fn())).not.toThrow()
  })

  it('removes all listeners for a specific event', () => {
    const emitter = new EventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('test', h1)
    emitter.on('test', h2)
    emitter.removeAllListeners('test')
    emitter.emit('test')

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('removes all listeners across all events', () => {
    const emitter = new EventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('a', h1)
    emitter.on('b', h2)
    emitter.removeAllListeners()
    emitter.emit('a')
    emitter.emit('b')

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })
})
