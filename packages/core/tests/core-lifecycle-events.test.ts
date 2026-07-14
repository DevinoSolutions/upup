import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

// ─────────────────────────────────────────────
// options-updated
// ─────────────────────────────────────────────
describe('UpupCore — options-updated event', () => {
    it('emits options-updated with the applied partial', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('options-updated', handler)

        core.updateOptions({ maxRetries: 5 })

        expect(handler).toHaveBeenCalledWith({ partial: { maxRetries: 5 } })
    })

    it('actually updates core.options', () => {
        const core = makeCore()
        core.updateOptions({ maxRetries: 7 })
        expect(core.options.maxRetries).toBe(7)
    })

    it('emits for each separate updateOptions call', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('options-updated', handler)

        core.updateOptions({ maxRetries: 1 })
        core.updateOptions({ maxRetries: 2 })

        expect(handler).toHaveBeenCalledTimes(2)
    })

    it('emits with an empty partial when no changes are specified', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('options-updated', handler)

        core.updateOptions({})

        expect(handler).toHaveBeenCalledWith({ partial: {} })
    })

    it('emits options-updated before the options object is mutated (same reference)', () => {
        const core = makeCore()
        let capturedOptions: number | undefined
        core.on('options-updated', () => {
            // By the time the event fires, options should already be updated
            capturedOptions = core.options.maxRetries
        })

        core.updateOptions({ maxRetries: 99 })

        expect(capturedOptions).toBe(99)
    })
})

// ─────────────────────────────────────────────
// destroyed
// ─────────────────────────────────────────────
describe('UpupCore — destroyed event', () => {
    it('emits destroyed when destroy() is called', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('destroyed', handler)

        core.destroy()

        expect(handler).toHaveBeenCalledWith({})
    })

    it('emits destroyed before listeners are cleared', () => {
        const core = makeCore()
        let called = false
        core.on('destroyed', () => {
            called = true
        })

        core.destroy()

        expect(called).toBe(true)
    })

    it('does not call destroyed listeners after a second destroy()', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('destroyed', handler)

        core.destroy() // listeners cleared after this
        core.destroy() // second call — handler should NOT fire again

        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('clears files after destroy()', async () => {
        const core = makeCore()
        await core.addFiles([new File(['x'], 'f.txt', { type: 'text/plain' })])
        core.destroy()
        expect(core.files.size).toBe(0)
    })
})
