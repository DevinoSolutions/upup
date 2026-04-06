import { describe, it, expect } from 'vitest'
import {
    getFilerobotTheme,
    getImageEditorCssOverrides,
} from '../src/lib/imageEditorHelpers'

// ─────────────────────────────────────────────
// getFilerobotTheme
// ─────────────────────────────────────────────
describe('getFilerobotTheme', () => {
    it('returns an object with palette and typography', () => {
        const theme = getFilerobotTheme(false)
        expect(theme).toHaveProperty('palette')
        expect(theme).toHaveProperty('typography')
    })

    it('typography always uses inherit font family', () => {
        expect(getFilerobotTheme(true).typography.fontFamily).toBe('inherit')
        expect(getFilerobotTheme(false).typography.fontFamily).toBe('inherit')
    })

    // Dark theme
    it('dark theme has dark background colors', () => {
        const { palette } = getFilerobotTheme(true)
        expect(palette['bg-primary']).toBe('#232323')
        expect(palette['bg-secondary']).toBe('#1a1a1a')
    })

    it('dark theme accent is cyan', () => {
        const { palette } = getFilerobotTheme(true)
        expect(palette['accent-primary']).toBe('#30C5F7')
    })

    it('dark theme text is white', () => {
        const { palette } = getFilerobotTheme(true)
        expect(palette['txt-primary']).toBe('#ffffff')
    })

    it('dark theme icons are white', () => {
        const { palette } = getFilerobotTheme(true)
        expect(palette['icons-primary']).toBe('#ffffff')
    })

    it('dark theme borders are dark gray', () => {
        const { palette } = getFilerobotTheme(true)
        expect(palette['borders-primary']).toBe('#4b5563')
    })

    // Light theme
    it('light theme has white background', () => {
        const { palette } = getFilerobotTheme(false)
        expect(palette['bg-primary']).toBe('#ffffff')
        expect(palette['bg-secondary']).toBe('#f9fafb')
    })

    it('light theme accent is blue', () => {
        const { palette } = getFilerobotTheme(false)
        expect(palette['accent-primary']).toBe('#2563eb')
    })

    it('light theme text is dark', () => {
        const { palette } = getFilerobotTheme(false)
        expect(palette['txt-primary']).toBe('#111827')
    })

    it('light theme icons are dark', () => {
        const { palette } = getFilerobotTheme(false)
        expect(palette['icons-primary']).toBe('#111827')
    })

    it('light theme borders are light gray', () => {
        const { palette } = getFilerobotTheme(false)
        expect(palette['borders-primary']).toBe('#d1d5db')
    })

    // Both themes differ
    it('dark and light themes produce different palettes', () => {
        const dark = getFilerobotTheme(true)
        const light = getFilerobotTheme(false)
        expect(dark.palette['bg-primary']).not.toBe(light.palette['bg-primary'])
        expect(dark.palette['accent-primary']).not.toBe(light.palette['accent-primary'])
        expect(dark.palette['txt-primary']).not.toBe(light.palette['txt-primary'])
    })

    it('both themes include accent opacity token', () => {
        expect(getFilerobotTheme(true).palette['accent_1_2_opacity']).toBeTruthy()
        expect(getFilerobotTheme(false).palette['accent_1_2_opacity']).toBeTruthy()
    })
})

// ─────────────────────────────────────────────
// getImageEditorCssOverrides
// ─────────────────────────────────────────────
describe('getImageEditorCssOverrides', () => {
    it('returns a non-empty string', () => {
        expect(typeof getImageEditorCssOverrides(true)).toBe('string')
        expect(getImageEditorCssOverrides(true).length).toBeGreaterThan(0)
        expect(typeof getImageEditorCssOverrides(false)).toBe('string')
        expect(getImageEditorCssOverrides(false).length).toBeGreaterThan(0)
    })

    it('dark overrides target data-upup-theme=dark selector', () => {
        const css = getImageEditorCssOverrides(true)
        expect(css).toContain("[data-upup-theme='dark']")
    })

    it('light overrides target data-upup-theme=light selector', () => {
        const css = getImageEditorCssOverrides(false)
        expect(css).toContain("[data-upup-theme='light']")
    })

    it('dark overrides do not contain light selectors', () => {
        const css = getImageEditorCssOverrides(true)
        expect(css).not.toContain("[data-upup-theme='light']")
    })

    it('light overrides do not contain dark selectors', () => {
        const css = getImageEditorCssOverrides(false)
        expect(css).not.toContain("[data-upup-theme='dark']")
    })

    it('dark overrides include save button background', () => {
        const css = getImageEditorCssOverrides(true)
        expect(css).toContain('FIE_topbar-save-button')
        expect(css).toContain('#30c5f7')
    })

    it('light overrides include save button background', () => {
        const css = getImageEditorCssOverrides(false)
        expect(css).toContain('FIE_topbar-save-button')
        expect(css).toContain('#2563eb')
    })

    it('dark overrides include input background override', () => {
        const css = getImageEditorCssOverrides(true)
        expect(css).toContain('SfxInput-Base')
        expect(css).toContain('#2d2d2d')
    })

    it('dark overrides include carousel gradient', () => {
        const css = getImageEditorCssOverrides(true)
        expect(css).toContain('FIE_carousel-prev-button')
        expect(css).toContain('FIE_carousel-next-button')
    })

    it('dark and light overrides are different strings', () => {
        expect(getImageEditorCssOverrides(true)).not.toBe(getImageEditorCssOverrides(false))
    })
})
