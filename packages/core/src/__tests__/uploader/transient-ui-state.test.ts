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
        s.openSourceOverlay() // idempotent: already open, no second notify
        expect(spy).toHaveBeenCalledTimes(1)
        s.closeSourceOverlay()
        expect(s.getSnapshot().sourceOverlayOpen).toBe(false)
        s.closeSourceOverlay() // idempotent: already closing, no extra notify
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it('two-phase close: marks closing, holds for overlayMs, then clears', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            overlayMs: 350,
        })
        s.openSourceOverlay()
        expect(s.getSnapshot().sourceOverlayClosing).toBe(false)
        s.closeSourceOverlay()
        // open flips false immediately; closing stays true for the reverse slide
        expect(s.getSnapshot().sourceOverlayOpen).toBe(false)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(true)
        vi.advanceTimersByTime(349)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(true)
        vi.advanceTimersByTime(1)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(false)
    })

    it('close is INSTANT (no closing phase) when motion is off', () => {
        const s = createTransientUiState({
            motion: () => 'off',
            reallyRemove: () => {},
            overlayMs: 350,
        })
        s.openSourceOverlay()
        s.closeSourceOverlay()
        expect(s.getSnapshot().sourceOverlayOpen).toBe(false)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(false)
    })

    it('open during the closing window snaps back open; the stale timer no-ops', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            overlayMs: 350,
        })
        s.openSourceOverlay()
        s.closeSourceOverlay()
        expect(s.getSnapshot().sourceOverlayClosing).toBe(true)
        s.openSourceOverlay() // re-open mid-close
        expect(s.getSnapshot().sourceOverlayOpen).toBe(true)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(false)
        // the original close-completion timer is now stale; it must not re-close
        vi.advanceTimersByTime(350)
        expect(s.getSnapshot().sourceOverlayOpen).toBe(true)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(false)
    })

    it('double-close in the closing window is harmless (single settle, no re-arm)', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            overlayMs: 350,
        })
        s.openSourceOverlay()
        const spy = vi.fn()
        s.subscribe(spy)
        s.closeSourceOverlay() // notify: closing=true
        s.closeSourceOverlay() // no-op: already closing
        expect(spy).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(350) // single completion notify: closing=false
        expect(spy).toHaveBeenCalledTimes(2)
        expect(s.getSnapshot().sourceOverlayClosing).toBe(false)
    })

    it('dropRejected generation token: a stale timer cannot clear a newer rejection', () => {
        const s = createTransientUiState({
            motion: () => 'on',
            reallyRemove: () => {},
            exitMs: 200,
            toastMs: 3000,
        })
        const spy = vi.fn()
        s.subscribe(spy)
        s.flagDropRejected('a') // t=0, timer fires at t=3000
        vi.advanceTimersByTime(1000)
        s.flagDropRejected('b') // t=1000, timer fires at t=4000
        expect(spy).toHaveBeenCalledTimes(2)
        // 3100ms after the FIRST rejection: its timer (t=3000) fires but is now
        // stale (generation moved on), so it must NOT clear the newer rejection.
        vi.advanceTimersByTime(2100) // t=3100
        expect(s.getSnapshot().dropRejected).toBe('b')
        expect(spy).toHaveBeenCalledTimes(2) // no spurious notify from the stale timer
        // 3100ms after the SECOND rejection: its own timer (t=4000) clears it.
        vi.advanceTimersByTime(1000) // t=4100
        expect(s.getSnapshot().dropRejected).toBe(null)
        expect(spy).toHaveBeenCalledTimes(3)
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
