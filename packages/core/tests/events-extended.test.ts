import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/events'

describe('EventEmitter — extended', () => {
    it('handler receives single payload object', () => {
        const emitter = new EventEmitter()
        const handler = vi.fn()
        emitter.on('multi-arg', handler)
        emitter.emit('multi-arg', { a: 1, b: 2, c: 3 })
        expect(handler).toHaveBeenCalledWith({ a: 1, b: 2, c: 3 })
    })

    it('handler receives undefined when emitted without payload', () => {
        const emitter = new EventEmitter()
        const handler = vi.fn()
        emitter.on('no-arg', handler)
        emitter.emit('no-arg')
        expect(handler).toHaveBeenCalledWith(undefined)
    })

    it('same handler registered twice only fires once per emit', () => {
        const emitter = new EventEmitter()
        const handler = vi.fn()
        emitter.on('dedup', handler)
        emitter.on('dedup', handler) // Set deduplicates
        emitter.emit('dedup')
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('handlers for different events are independent', () => {
        const emitter = new EventEmitter()
        const h1 = vi.fn()
        const h2 = vi.fn()
        emitter.on('event-a', h1)
        emitter.on('event-b', h2)
        emitter.emit('event-a')
        expect(h1).toHaveBeenCalledOnce()
        expect(h2).not.toHaveBeenCalled()
    })

    it('removeAllListeners for one event does not affect others', () => {
        const emitter = new EventEmitter()
        const h1 = vi.fn()
        const h2 = vi.fn()
        emitter.on('keep', h1)
        emitter.on('remove', h2)
        emitter.removeAllListeners('remove')
        emitter.emit('keep')
        emitter.emit('remove')
        expect(h1).toHaveBeenCalledOnce()
        expect(h2).not.toHaveBeenCalled()
    })

    it('unsubscribe is idempotent — calling twice does not throw', () => {
        const emitter = new EventEmitter()
        const unsub = emitter.on('test', vi.fn())
        unsub()
        expect(() => unsub()).not.toThrow()
    })

    it('off for non-existent event does not throw', () => {
        const emitter = new EventEmitter()
        expect(() => emitter.off('ghost', vi.fn())).not.toThrow()
    })

    it('handlers fire in registration order', () => {
        const emitter = new EventEmitter()
        const order: number[] = []
        emitter.on('ordered', () => order.push(1))
        emitter.on('ordered', () => order.push(2))
        emitter.on('ordered', () => order.push(3))
        emitter.emit('ordered')
        expect(order).toEqual([1, 2, 3])
    })

    it('handler can unsubscribe itself during emit', () => {
        const emitter = new EventEmitter()
        const other = vi.fn()
        let unsub: () => void
        const selfRemove = () => { unsub() }
        unsub = emitter.on('self-remove', selfRemove)
        emitter.on('self-remove', other)
        emitter.emit('self-remove')
        // Second emit — selfRemove should not fire, other should
        emitter.emit('self-remove')
        expect(other).toHaveBeenCalledTimes(2)
    })

    it('emit with complex object payloads', () => {
        const emitter = new EventEmitter()
        const handler = vi.fn()
        emitter.on('complex', handler)
        const payload = { nested: { arr: [1, 2], fn: () => {} }, date: new Date() }
        emitter.emit('complex', payload)
        expect(handler).toHaveBeenCalledWith(payload)
    })
})
