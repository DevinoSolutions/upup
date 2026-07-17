import { describe, it, expect, vi } from 'vitest'
import { createMotionGate } from '../../uploader/motion-gate'

function fakeMatchMedia(reduce: boolean) {
    const listeners = new Set<(e: { matches: boolean }) => void>()
    return {
        impl: (query: string) => ({
            matches: query.includes('reduce') ? reduce : false,
            addEventListener: (
                _: string,
                cb: (e: { matches: boolean }) => void,
            ) => listeners.add(cb),
            removeEventListener: (
                _: string,
                cb: (e: { matches: boolean }) => void,
            ) => listeners.delete(cb),
        }),
        fire(matches: boolean) {
            listeners.forEach(cb => cb({ matches }))
        },
    }
}

describe('createMotionGate', () => {
    it('defaults to on', () => {
        const mm = fakeMatchMedia(false)
        const gate = createMotionGate({
            animations: undefined,
            matchMedia: mm.impl,
        })
        expect(gate.getSnapshot()).toBe('on')
        gate.destroy()
    })

    it('animations=false forces off', () => {
        const mm = fakeMatchMedia(false)
        const gate = createMotionGate({
            animations: false,
            matchMedia: mm.impl,
        })
        expect(gate.getSnapshot()).toBe('off')
        gate.destroy()
    })

    it('prefers-reduced-motion forces off even with animations=true', () => {
        const mm = fakeMatchMedia(true)
        const gate = createMotionGate({ animations: true, matchMedia: mm.impl })
        expect(gate.getSnapshot()).toBe('off')
        gate.destroy()
    })

    it('reacts to a live media-query change', () => {
        const mm = fakeMatchMedia(false)
        const gate = createMotionGate({ animations: true, matchMedia: mm.impl })
        const spy = vi.fn()
        gate.subscribe(spy)
        mm.fire(true)
        expect(gate.getSnapshot()).toBe('off')
        expect(spy).toHaveBeenCalled()
        gate.destroy()
    })

    it('survives a missing matchMedia (SSR): stays on', () => {
        const gate = createMotionGate({
            animations: true,
            matchMedia: undefined,
        })
        expect(gate.getSnapshot()).toBe('on')
        gate.destroy()
    })
})
