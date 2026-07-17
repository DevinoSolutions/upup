import { describe, it, expect, vi, afterEach } from 'vitest'
import { ThemeStore } from '../src/theme/theme-store'

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('ThemeStore', () => {
    it('resolves an explicit dark mode', () => {
        const store = new ThemeStore({ mode: 'dark' })
        const snap = store.getSnapshot()
        expect(snap.themeMode).toBe('dark')
        expect(snap.isDark).toBe(true)
        expect(snap.resolved.mode).toBe('dark')
    })

    it('defaults to light when no config is given', () => {
        expect(new ThemeStore().getSnapshot().isDark).toBe(false)
    })

    it('init() resolves system → dark via matchMedia and notifies subscribers', () => {
        vi.stubGlobal('window', {
            matchMedia: () => ({
                matches: true,
                addEventListener: () => {},
                removeEventListener: () => {},
            }),
        })
        const store = new ThemeStore({ mode: 'system' })
        // Before init the system default is light.
        expect(store.getSnapshot().isDark).toBe(false)
        let notified = false
        store.subscribe(() => {
            notified = true
        })
        store.init()
        expect(store.getSnapshot().isDark).toBe(true)
        expect(notified).toBe(true)
    })

    it('setThemeConfig re-resolves and notifies', () => {
        const store = new ThemeStore({ mode: 'light' })
        let count = 0
        store.subscribe(() => {
            count += 1
        })
        store.setThemeConfig({ mode: 'dark' })
        expect(store.getSnapshot().isDark).toBe(true)
        expect(count).toBe(1)
    })

    it('setThemeConfig is a no-op for a structurally-equal-but-new config', () => {
        const store = new ThemeStore({ mode: 'light' })
        const before = store.getSnapshot()
        const spy = vi.fn()
        store.subscribe(spy)
        // Fresh object literal, same content — mimics a consumer inlining
        // theme={{ mode: 'light' }} on every render.
        store.setThemeConfig({ mode: 'light' })
        expect(spy).not.toHaveBeenCalled()
        expect(store.getSnapshot()).toBe(before)
    })

    it('setThemeConfig notifies and flips isDark when the mode changes', () => {
        const store = new ThemeStore({ mode: 'light' })
        expect(store.getSnapshot().isDark).toBe(false)
        const spy = vi.fn()
        store.subscribe(spy)
        store.setThemeConfig({ mode: 'dark' })
        expect(spy).toHaveBeenCalledTimes(1)
        expect(store.getSnapshot().isDark).toBe(true)
    })

    it('setThemeConfig notifies when slots change with an unchanged mode', () => {
        const store = new ThemeStore({ mode: 'light' })
        const spy = vi.fn()
        store.subscribe(spy)
        store.setThemeConfig({
            mode: 'light',
            slots: { uploader: { root: 'custom-root' } },
        })
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it('setThemeConfig notifies when tokens change with an unchanged mode', () => {
        const store = new ThemeStore({ mode: 'light' })
        const spy = vi.fn()
        store.subscribe(spy)
        store.setThemeConfig({
            mode: 'light',
            tokens: { color: { primary: '#123456' } },
        })
        expect(spy).toHaveBeenCalledTimes(1)
    })
})
