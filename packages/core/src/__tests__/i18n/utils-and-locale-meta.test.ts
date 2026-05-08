import { describe, it, expect } from 'vitest'
import { t, plural, mergeTranslations } from '../../i18n/utils'
import { normalizeBcp47, LOCALE_META } from '../../i18n/locale-meta'
import type { UpupMessages } from '../../i18n/types'

// ─────────────────────────────────────────────
// t() — template interpolation
// ─────────────────────────────────────────────
describe('t()', () => {
    it('returns the template unchanged when no values given', () => {
        expect(t('Hello world')).toBe('Hello world')
    })

    it('interpolates a single {{key}} placeholder', () => {
        expect(t('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice')
    })

    it('interpolates multiple placeholders', () => {
        expect(t('{{a}} + {{b}} = {{c}}', { a: 1, b: 2, c: 3 })).toBe('1 + 2 = 3')
    })

    it('leaves unknown placeholders as {{key}}', () => {
        expect(t('Hello {{unknown}}')).toBe('Hello {{unknown}}')
    })

    it('handles numeric values', () => {
        expect(t('Count: {{n}}', { n: 42 })).toBe('Count: 42')
    })

    it('interpolates the same placeholder used twice', () => {
        expect(t('{{x}} and {{x}}', { x: 'hi' })).toBe('hi and hi')
    })

    it('returns empty string when template is empty', () => {
        expect(t('')).toBe('')
    })
})

// ─────────────────────────────────────────────
// plural() — plural form selection
// ─────────────────────────────────────────────
describe('plural()', () => {
    const msgs = {
        file_one: 'one file',
        file_other: 'many files',
        file: 'file fallback',
    } as unknown as UpupMessages

    it('returns the _one form for count = 1', () => {
        expect(plural(msgs, 'file', 1)).toBe('one file')
    })

    it('returns the _other form for count = 0', () => {
        expect(plural(msgs, 'file', 0)).toBe('many files')
    })

    it('returns the _other form for count > 1', () => {
        expect(plural(msgs, 'file', 5)).toBe('many files')
    })

    it('falls back to base key when plural-specific key is missing', () => {
        const minimal = { file: 'file fallback' } as unknown as UpupMessages
        expect(plural(minimal, 'file', 2)).toBe('file fallback')
    })

    it('returns empty string when key is completely missing', () => {
        const empty = {} as unknown as UpupMessages
        expect(plural(empty, 'nonexistent', 1)).toBe('')
    })
})

// ─────────────────────────────────────────────
// mergeTranslations() — deep merge
// ─────────────────────────────────────────────
describe('mergeTranslations()', () => {
    const base = {
        hello: 'Hello',
        nested: { a: 'A', b: 'B' },
    } as unknown as UpupMessages

    it('returns base unchanged when no overrides given', () => {
        expect(mergeTranslations(base)).toBe(base)
    })

    it('overrides a flat key', () => {
        const result = mergeTranslations(base, { hello: 'Bonjour' } as any)
        expect((result as any).hello).toBe('Bonjour')
    })

    it('preserves non-overridden flat keys', () => {
        const result = mergeTranslations(base, { hello: 'Bonjour' } as any)
        expect((result as any).nested).toEqual({ a: 'A', b: 'B' })
    })

    it('deep-merges nested object keys', () => {
        const result = mergeTranslations(base, {
            nested: { b: 'B2' },
        } as any)
        expect((result as any).nested.a).toBe('A')
        expect((result as any).nested.b).toBe('B2')
    })

    it('does not mutate the original base', () => {
        mergeTranslations(base, { hello: 'Changed' } as any)
        expect((base as any).hello).toBe('Hello')
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
        expect(LOCALE_META['en-US'].dir).toBe('ltr')
    })

    it('ar-SA is rtl', () => {
        expect(LOCALE_META['ar-SA'].dir).toBe('rtl')
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
