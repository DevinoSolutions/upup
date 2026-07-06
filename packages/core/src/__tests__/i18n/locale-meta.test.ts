import { describe, it, expect } from 'vitest'
import { normalizeBcp47, LOCALE_META } from '../../i18n/locale-meta'
import { createTranslator } from '../../i18n/create-translator'
import { enUS } from '../../i18n/locales/en-US'

// ─────────────────────────────────────────────
// createTranslator — overrides deep-merge (absorbs deprecated mergeTranslations())
// ─────────────────────────────────────────────
describe('createTranslator — overrides deep-merge (absorbs deprecated mergeTranslations())', () => {
    it('applies a flat override onto the base bundle', () => {
        const translate = createTranslator({
            bundle: enUS,
            overrides: { common: { cancel: 'Annuler' } },
        })
        expect(translate('common.cancel')).toBe('Annuler')
    })

    it('preserves non-overridden keys in the same namespace', () => {
        const translate = createTranslator({
            bundle: enUS,
            overrides: { common: { cancel: 'Annuler' } },
        })
        expect(translate('common.done')).toBe(enUS.messages.common.done)
    })

    it('does not mutate the base bundle', () => {
        createTranslator({
            bundle: enUS,
            overrides: { common: { cancel: 'Changed' } },
        })
        expect(enUS.messages.common.cancel).not.toBe('Changed')
    })
})

// ─────────────────────────────────────────────
// normalizeBcp47() — underscore to hyphen
// ─────────────────────────────────────────────
describe('normalizeBcp47()', () => {
    it('converts en_US to en-US', () => {
        expect(normalizeBcp47('en_US')).toBe('en-US')
    })

    it('converts fr_FR to fr-FR', () => {
        expect(normalizeBcp47('fr_FR')).toBe('fr-FR')
    })

    it('converts zh_CN to zh-CN', () => {
        expect(normalizeBcp47('zh_CN')).toBe('zh-CN')
    })

    it('leaves already-hyphenated codes unchanged', () => {
        expect(normalizeBcp47('en-US')).toBe('en-US')
    })

    it('replaces all underscores', () => {
        expect(normalizeBcp47('zh_Hant_TW')).toBe('zh-Hant-TW')
    })
})

// ─────────────────────────────────────────────
// LOCALE_META — structure
// ─────────────────────────────────────────────
describe('LOCALE_META', () => {
    it('contains 9 locale entries', () => {
        expect(Object.keys(LOCALE_META).length).toBe(9)
    })

    it('en-US is ltr', () => {
        expect(LOCALE_META['en-US']?.dir).toBe('ltr')
    })

    it('ar-SA is rtl', () => {
        expect(LOCALE_META['ar-SA']?.dir).toBe('rtl')
    })

    it('every entry has code, language, and dir fields', () => {
        for (const meta of Object.values(LOCALE_META)) {
            expect(meta).toHaveProperty('code')
            expect(meta).toHaveProperty('language')
            expect(meta).toHaveProperty('dir')
        }
    })

    it('dir values are only "ltr" or "rtl"', () => {
        for (const meta of Object.values(LOCALE_META)) {
            expect(['ltr', 'rtl']).toContain(meta.dir)
        }
    })

    it('map key matches the code field', () => {
        for (const [key, meta] of Object.entries(LOCALE_META)) {
            expect(meta.code).toBe(key)
        }
    })

    it('language strings are non-empty', () => {
        for (const meta of Object.values(LOCALE_META)) {
            expect(meta.language.length).toBeGreaterThan(0)
        }
    })
})
