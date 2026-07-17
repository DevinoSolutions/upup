import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTransientUiState } from '../../uploader/transient-ui-state'

describe('createTransientUiState', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('deferred removal: marks leaving, removes after exitMs, emits once', () => {
        const removed: string[] = []
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: id => removed.push(id),
            exitMs: 200,
        })
        s.removeFileAnimated('f1')
        expect(s.getSnapshot().leavingFileIds.has('f1')).toBe(true)
        expect(removed).toEqual([])
        vi.advanceTimersByTime(200)
        expect(removed).toEqual(['f1'])
        expect(s.getSnapshot().leavingFileIds.has('f1')).toBe(false)
    })

    it('deferred removal is INSTANT when motion is off', () => {
        const removed: string[] = []
        const s = createTransientUiState({
            motion: () => 'off',
            reallyRemove: id => removed.push(id),
            exitMs: 200,
        })
        s.removeFileAnimated('f1')
        expect(removed).toEqual(['f1'])
        expect(s.getSnapshot().leavingFileIds.size).toBe(0)
    })

    it('double-remove of the same id is a no-op while leaving', () => {
        const removed: string[] = []
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: id => removed.push(id),
            exitMs: 200,
        })
        s.removeFileAnimated('f1')
        s.removeFileAnimated('f1')
        vi.advanceTimersByTime(200)
        expect(removed).toEqual(['f1'])
    })

    it('source overlay open/close notifies subscribers', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            exitMs: 200,
        })
        const spy = vi.fn()
        s.subscribe(spy)
        s.openSourceOverlay()
        expect(s.getSnapshot().sourceOverlayOpen).toBe(true)
        s.closeSourceOverlay()
        expect(s.getSnapshot().sourceOverlayOpen).toBe(false)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it('dropRejected sets the provider and auto-clears', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            exitMs: 200,
            toastMs: 3000,
        })
        s.flagDropRejected('googleDrive')
        expect(s.getSnapshot().dropRejected).toBe('googleDrive')
        vi.advanceTimersByTime(3000)
        expect(s.getSnapshot().dropRejected).toBe(null)
    })

    it('destroy cancels pending timers (no removal after destroy)', () => {
        const removed: string[] = []
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: id => removed.push(id),
            exitMs: 200,
        })
        s.removeFileAnimated('f1')
        s.destroy()
        vi.advanceTimersByTime(500)
        expect(removed).toEqual([])
    })

    it('getSnapshot returns a stable reference between notifications', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            exitMs: 200,
        })
        const a = s.getSnapshot()
        const b = s.getSnapshot()
        expect(a).toBe(b)
        s.openSourceOverlay()
        const c = s.getSnapshot()
        expect(c).not.toBe(a)
        expect(s.getSnapshot()).toBe(c)
    })

    it('unsubscribe stops one listener while a second still fires', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            exitMs: 200,
        })
        const first = vi.fn()
        const second = vi.fn()
        const unsubFirst = s.subscribe(first)
        s.subscribe(second)
        unsubFirst()
        s.openSourceOverlay()
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })
})
