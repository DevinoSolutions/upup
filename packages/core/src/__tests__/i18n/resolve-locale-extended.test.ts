import { describe, it, expect } from 'vitest'
import { buildFallbackChain, resolveMessage } from '../../i18n/resolve-locale'
import { enUS } from '../../i18n/locales/en-US'
import type { LocaleBundle } from '../../i18n/types'

// ─────────────────────────────────────────────
// buildFallbackChain — extended
// ─────────────────────────────────────────────
describe('buildFallbackChain — extended', () => {
    it('handles language-only code (no region)', () => {
        expect(buildFallbackChain('de')).toEqual(['de', 'en-US'])
    })

    it('handles code with region', () => {
        expect(buildFallbackChain('pt-BR')).toEqual(['pt-BR', 'pt', 'en-US'])
    })

    it('en (no region) still gets en-US fallback', () => {
        expect(buildFallbackChain('en')).toEqual(['en', 'en-US'])
    })

    it('en-GB gets en fallback then en-US', () => {
        expect(buildFallbackChain('en-GB')).toEqual(['en-GB', 'en', 'en-US'])
    })

    it('ar-SA gets ar then en-US', () => {
        expect(buildFallbackChain('ar-SA')).toEqual(['ar-SA', 'ar', 'en-US'])
    })

    it('zh-CN gets zh then en-US', () => {
        expect(buildFallbackChain('zh-CN')).toEqual(['zh-CN', 'zh', 'en-US'])
    })

    it('always returns at least one item', () => {
        expect(buildFallbackChain('xx').length).toBeGreaterThanOrEqual(1)
    })
})

// ─────────────────────────────────────────────
// resolveMessage — extended
// ─────────────────────────────────────────────
describe('resolveMessage — extended', () => {
    const bundles = new Map<string, LocaleBundle>()
    bundles.set('en-US', enUS)

    it('returns undefined for completely unknown namespace', () => {
        const result = resolveMessage(bundles, ['en-US'], 'nonexistent' as any, 'key')
        expect(result).toBeUndefined()
    })

    it('returns undefined for unknown key in existing namespace', () => {
        const result = resolveMessage(bundles, ['en-US'], 'common', 'totallyFakeKey')
        expect(result).toBeUndefined()
    })

    it('returns undefined when no bundles match the chain', () => {
        const result = resolveMessage(bundles, ['xx-XX', 'xx'], 'common', 'cancel')
        expect(result).toBeUndefined()
    })

    it('resolves from en-US for known key', () => {
        const result = resolveMessage(bundles, ['en-US'], 'common', 'cancel')
        expect(result).toBe('Cancel')
    })

    it('skips missing bundles in chain gracefully', () => {
        // Chain has codes that don't exist in the map
        const result = resolveMessage(bundles, ['fr-FR', 'fr', 'en-US'], 'common', 'cancel')
        expect(result).toBe('Cancel') // falls through to en-US
    })

    it('resolves from first matching bundle in chain', () => {
        const deBund: LocaleBundle = {
            code: 'de-DE',
            language: 'Deutsch',
            dir: 'ltr',
            messages: {
                ...enUS.messages,
                common: { ...enUS.messages.common, cancel: 'Abbrechen' },
            },
        }
        const testBundles = new Map<string, LocaleBundle>()
        testBundles.set('en-US', enUS)
        testBundles.set('de-DE', deBund)

        const result = resolveMessage(testBundles, ['de-DE', 'de', 'en-US'], 'common', 'cancel')
        expect(result).toBe('Abbrechen')
    })

    it('empty chain returns undefined', () => {
        const result = resolveMessage(bundles, [], 'common', 'cancel')
        expect(result).toBeUndefined()
    })
})
