import { describe, it, expect } from 'vitest'
import { lightPreset, darkPreset } from '../theme/presets'

const REQUIRED_COLOR_KEYS = [
    'surface',
    'surfaceAlt',
    'primary',
    'primaryHover',
    'text',
    'textMuted',
    'border',
    'borderActive',
    'danger',
    'success',
    'dragBg',
    'overlay',
]
const REQUIRED_RADIUS_KEYS = ['sm', 'md', 'lg', 'full']
const REQUIRED_SHADOW_KEYS = ['sm', 'md', 'lg']
const REQUIRED_SPACING_KEYS = ['xs', 'sm', 'md', 'lg']

// ─────────────────────────────────────────────
// lightPreset structure
// ─────────────────────────────────────────────
describe('lightPreset structure', () => {
    it('has a color group', () => {
        expect(lightPreset).toHaveProperty('color')
    })

    it('has a radius group', () => {
        expect(lightPreset).toHaveProperty('radius')
    })

    it('has a shadow group', () => {
        expect(lightPreset).toHaveProperty('shadow')
    })

    it('has a spacing group', () => {
        expect(lightPreset).toHaveProperty('spacing')
    })

    it('color group has all required keys', () => {
        for (const key of REQUIRED_COLOR_KEYS) {
            expect(lightPreset.color).toHaveProperty(key)
        }
    })

    it('radius group has all required keys', () => {
        for (const key of REQUIRED_RADIUS_KEYS) {
            expect(lightPreset.radius).toHaveProperty(key)
        }
    })

    it('shadow group has all required keys', () => {
        for (const key of REQUIRED_SHADOW_KEYS) {
            expect(lightPreset.shadow).toHaveProperty(key)
        }
    })

    it('spacing group has all required keys', () => {
        for (const key of REQUIRED_SPACING_KEYS) {
            expect(lightPreset.spacing).toHaveProperty(key)
        }
    })

    it('surface is white (#FFFFFF)', () => {
        expect(lightPreset.color.surface).toBe('#FFFFFF')
    })

    it('primary is the brand blue (#1849D6)', () => {
        expect(lightPreset.color.primary).toBe('#1849D6')
    })

    it('all color values are non-empty strings', () => {
        for (const val of Object.values(lightPreset.color)) {
            expect(typeof val).toBe('string')
            expect(val.length).toBeGreaterThan(0)
        }
    })

    it('all radius values end with "px" or are "9999px"', () => {
        for (const val of Object.values(lightPreset.radius)) {
            expect(val.endsWith('px')).toBe(true)
        }
    })
})

// ─────────────────────────────────────────────
// darkPreset structure
// ─────────────────────────────────────────────
describe('darkPreset structure', () => {
    it('has the same top-level groups as lightPreset', () => {
        expect(Object.keys(darkPreset).sort()).toEqual(
            Object.keys(lightPreset).sort(),
        )
    })

    it('color group has all required keys', () => {
        for (const key of REQUIRED_COLOR_KEYS) {
            expect(darkPreset.color).toHaveProperty(key)
        }
    })

    it('radius group has all required keys', () => {
        for (const key of REQUIRED_RADIUS_KEYS) {
            expect(darkPreset.radius).toHaveProperty(key)
        }
    })

    it('surface is dark (#1A1A2E)', () => {
        expect(darkPreset.color.surface).toBe('#1A1A2E')
    })

    it('primary is the dark-mode cyan (#30C5F7)', () => {
        expect(darkPreset.color.primary).toBe('#30C5F7')
    })

    it('text is white in dark mode', () => {
        expect(darkPreset.color.text).toBe('#FFFFFF')
    })
})

// ─────────────────────────────────────────────
// Preset contrast — light vs dark must differ
// ─────────────────────────────────────────────
describe('lightPreset vs darkPreset contrast', () => {
    it('surface colors differ between presets', () => {
        expect(lightPreset.color.surface).not.toBe(darkPreset.color.surface)
    })

    it('primary colors differ between presets', () => {
        expect(lightPreset.color.primary).not.toBe(darkPreset.color.primary)
    })

    it('text colors differ between presets', () => {
        expect(lightPreset.color.text).not.toBe(darkPreset.color.text)
    })

    it('both presets have identical radius values (shape-agnostic)', () => {
        expect(lightPreset.radius).toEqual(darkPreset.radius)
    })

    it('both presets have identical spacing values', () => {
        expect(lightPreset.spacing).toEqual(darkPreset.spacing)
    })

    it('shadow values differ (dark shadows are stronger)', () => {
        expect(lightPreset.shadow.lg).not.toBe(darkPreset.shadow.lg)
    })
})
