import { describe, it, expect } from 'vitest'
import { resolveTheme } from '../theme/resolve-theme'
import { lightPreset, darkPreset } from '../theme/presets'

// ─────────────────────────────────────────────
// resolveTheme — defaults
// ─────────────────────────────────────────────
describe('resolveTheme — defaults', () => {
    it('returns light mode when called with no arguments', () => {
        const result = resolveTheme()
        expect(result.mode).toBe('light')
    })

    it('tokens match lightPreset when no overrides given', () => {
        const result = resolveTheme()
        expect(result.tokens).toEqual(lightPreset)
    })

    it('returns empty slots object when no slots provided', () => {
        const result = resolveTheme()
        expect(result.slots).toEqual({})
    })

    it('explicit light mode also uses lightPreset', () => {
        const result = resolveTheme({ mode: 'light' })
        expect(result.tokens).toEqual(lightPreset)
    })
})

// ─────────────────────────────────────────────
// resolveTheme — dark mode
// ─────────────────────────────────────────────
describe('resolveTheme — dark mode', () => {
    it('returns dark mode tokens when mode is "dark"', () => {
        const result = resolveTheme({ mode: 'dark' })
        expect(result.tokens).toEqual(darkPreset)
    })

    it('mode field is "dark"', () => {
        const result = resolveTheme({ mode: 'dark' })
        expect(result.mode).toBe('dark')
    })

    it('dark preset primary differs from light preset primary', () => {
        const light = resolveTheme({ mode: 'light' })
        const dark = resolveTheme({ mode: 'dark' })
        // The two presets must be distinct (sanity check that we loaded the right base)
        expect(dark.tokens.color.surface).not.toBe(light.tokens.color.surface)
    })
})

// ─────────────────────────────────────────────
// resolveTheme — system mode
// ─────────────────────────────────────────────
describe('resolveTheme — system mode', () => {
    it('returns a result without throwing in node (no window)', () => {
        expect(() => resolveTheme({ mode: 'system' })).not.toThrow()
    })

    it('mode field is "system" regardless of detected environment', () => {
        const result = resolveTheme({ mode: 'system' })
        expect(result.mode).toBe('system')
    })

    it('falls back to lightPreset in non-browser (jsdom/node) environment', () => {
        // window.matchMedia is not present in node → detectSystemMode returns 'light'
        const result = resolveTheme({ mode: 'system' })
        expect(result.tokens).toEqual(lightPreset)
    })
})

// ─────────────────────────────────────────────
// resolveTheme — provider token overrides
// ─────────────────────────────────────────────
describe('resolveTheme — provider token overrides', () => {
    it('overrides a top-level color token', () => {
        const result = resolveTheme(undefined, { color: { primary: '#FF0000' } })
        expect(result.tokens.color.primary).toBe('#FF0000')
    })

    it('preserves sibling tokens not touched by the override', () => {
        const result = resolveTheme(undefined, { color: { primary: '#FF0000' } })
        expect(result.tokens.color.surface).toBe(lightPreset.color.surface)
    })

    it('overrides a radius token', () => {
        const result = resolveTheme(undefined, { radius: { md: '16px' } })
        expect(result.tokens.radius.md).toBe('16px')
        expect(result.tokens.radius.sm).toBe(lightPreset.radius.sm)
    })
})

// ─────────────────────────────────────────────
// resolveTheme — instance token overrides
// ─────────────────────────────────────────────
describe('resolveTheme — instance token overrides', () => {
    it('instance override wins over provider override', () => {
        const result = resolveTheme(
            { tokens: { color: { primary: '#00FF00' } } },
            { color: { primary: '#FF0000' } },
        )
        expect(result.tokens.color.primary).toBe('#00FF00')
    })

    it('instance override preserves provider tokens not re-specified', () => {
        const result = resolveTheme(
            { tokens: { color: { primary: '#00FF00' } } },
            { color: { text: '#111111' } },
        )
        expect(result.tokens.color.text).toBe('#111111')
        expect(result.tokens.color.primary).toBe('#00FF00')
    })

    it('shadow token override is applied', () => {
        const result = resolveTheme({ tokens: { shadow: { lg: 'none' } } })
        expect(result.tokens.shadow.lg).toBe('none')
        expect(result.tokens.shadow.sm).toBe(lightPreset.shadow.sm)
    })
})

// ─────────────────────────────────────────────
// resolveTheme — slot merging
// ─────────────────────────────────────────────
describe('resolveTheme — slot merging', () => {
    it('provider slots appear in result', () => {
        const result = resolveTheme(undefined, undefined, { root: 'provider-root' } as any)
        expect((result.slots as any).root).toBe('provider-root')
    })

    it('instance slots override provider slots for the same key', () => {
        const result = resolveTheme(
            { slots: { root: 'instance-root' } as any },
            undefined,
            { root: 'provider-root' } as any,
        )
        expect((result.slots as any).root).toBe('instance-root')
    })

    it('provider slot keys not overridden by instance are preserved', () => {
        const result = resolveTheme(
            { slots: { dropzone: 'instance-dz' } as any },
            undefined,
            { root: 'provider-root', dropzone: 'provider-dz' } as any,
        )
        expect((result.slots as any).root).toBe('provider-root')
        expect((result.slots as any).dropzone).toBe('instance-dz')
    })
})
