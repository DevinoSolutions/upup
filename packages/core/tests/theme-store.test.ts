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
})
