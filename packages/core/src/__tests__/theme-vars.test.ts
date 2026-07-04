import { describe, it, expect } from 'vitest'
import { tokensToVars, tokensToVarRefs, UPUP_VAR_PREFIX } from '../theme/vars'
import { lightPreset } from '../theme/presets'

// ─────────────────────────────────────────────
// UPUP_VAR_PREFIX
// ─────────────────────────────────────────────
describe('UPUP_VAR_PREFIX', () => {
    it('equals "--upup-"', () => {
        expect(UPUP_VAR_PREFIX).toBe('--upup-')
    })

    it('starts with "--"', () => {
        expect(UPUP_VAR_PREFIX.startsWith('--')).toBe(true)
    })
})

// ─────────────────────────────────────────────
// tokensToVars
// ─────────────────────────────────────────────
describe('tokensToVars', () => {
    it('returns a plain object', () => {
        const result = tokensToVars(lightPreset)
        expect(typeof result).toBe('object')
        expect(result).not.toBeNull()
    })

    it('produces keys starting with --upup-', () => {
        const vars = tokensToVars(lightPreset)
        for (const key of Object.keys(vars)) {
            expect(key.startsWith('--upup-')).toBe(true)
        }
    })

    it('maps color.surface to --upup-color-surface', () => {
        const vars = tokensToVars(lightPreset)
        expect(vars['--upup-color-surface']).toBe(lightPreset.color.surface)
    })

    it('maps color.primaryHover with camelCase converted to kebab-case', () => {
        const vars = tokensToVars(lightPreset)
        expect(vars['--upup-color-primary-hover']).toBe(
            lightPreset.color.primaryHover,
        )
    })

    it('maps color.surfaceAlt to --upup-color-surface-alt', () => {
        const vars = tokensToVars(lightPreset)
        expect(vars['--upup-color-surface-alt']).toBe(
            lightPreset.color.surfaceAlt,
        )
    })

    it('maps radius.sm to --upup-radius-sm', () => {
        const vars = tokensToVars(lightPreset)
        expect(vars['--upup-radius-sm']).toBe(lightPreset.radius.sm)
    })

    it('maps shadow.md to --upup-shadow-md', () => {
        const vars = tokensToVars(lightPreset)
        expect(vars['--upup-shadow-md']).toBe(lightPreset.shadow.md)
    })

    it('values are all strings', () => {
        const vars = tokensToVars(lightPreset)
        for (const val of Object.values(vars)) {
            expect(typeof val).toBe('string')
        }
    })

    it('number of entries equals total token leaf count', () => {
        const vars = tokensToVars(lightPreset)
        const leafCount = Object.values(lightPreset).reduce(
            (acc, group) => acc + Object.keys(group as object).length,
            0,
        )
        expect(Object.keys(vars).length).toBe(leafCount)
    })

    it('does not contain any undefined values', () => {
        const vars = tokensToVars(lightPreset)
        for (const val of Object.values(vars)) {
            expect(val).not.toBeUndefined()
        }
    })
})

// ─────────────────────────────────────────────
// tokensToVarRefs
// ─────────────────────────────────────────────
describe('tokensToVarRefs', () => {
    it('returns an object with color, radius, shadow, spacing groups', () => {
        const refs = tokensToVarRefs()
        expect(refs).toHaveProperty('color')
        expect(refs).toHaveProperty('radius')
        expect(refs).toHaveProperty('shadow')
        expect(refs).toHaveProperty('spacing')
    })

    it('color.surface is a var() reference', () => {
        const refs = tokensToVarRefs()
        expect(refs.color.surface).toBe('var(--upup-color-surface)')
    })

    it('color.primaryHover uses kebab-case in var reference', () => {
        const refs = tokensToVarRefs()
        expect(refs.color.primaryHover).toBe('var(--upup-color-primary-hover)')
    })

    it('color.surfaceAlt uses kebab-case in var reference', () => {
        const refs = tokensToVarRefs()
        expect(refs.color.surfaceAlt).toBe('var(--upup-color-surface-alt)')
    })

    it('radius.md is a var() reference', () => {
        const refs = tokensToVarRefs()
        expect(refs.radius.md).toBe('var(--upup-radius-md)')
    })

    it('shadow.lg is a var() reference', () => {
        const refs = tokensToVarRefs()
        expect(refs.shadow.lg).toBe('var(--upup-shadow-lg)')
    })

    it('all leaf values start with "var(--upup-"', () => {
        const refs = tokensToVarRefs()
        for (const group of Object.values(refs)) {
            for (const val of Object.values(group as object)) {
                expect((val as string).startsWith('var(--upup-')).toBe(true)
            }
        }
    })

    it('all leaf values end with ")"', () => {
        const refs = tokensToVarRefs()
        for (const group of Object.values(refs)) {
            for (const val of Object.values(group as object)) {
                expect((val as string).endsWith(')')).toBe(true)
            }
        }
    })

    it('var refs match the keys produced by tokensToVars for lightPreset', () => {
        const refs = tokensToVarRefs()
        const vars = tokensToVars(lightPreset)
        // Every var-ref should correspond to a real CSS var key
        expect(refs.color.surface).toBe(`var(--upup-color-surface)`)
        expect(Object.keys(vars)).toContain('--upup-color-surface')
    })
})
