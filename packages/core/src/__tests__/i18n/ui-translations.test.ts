import { describe, it, expect } from 'vitest'
import { createTranslator } from '../../i18n/create-translator'
import { enUS } from '../../i18n/locales/en-US'
import { arSA } from '../../i18n/locales/ar-SA'
import { deDE } from '../../i18n/locales/de-DE'
import { esES } from '../../i18n/locales/es-ES'
import { frFR } from '../../i18n/locales/fr-FR'
import { jaJP } from '../../i18n/locales/ja-JP'
import { koKR } from '../../i18n/locales/ko-KR'
import { zhCN } from '../../i18n/locales/zh-CN'
import { zhTW } from '../../i18n/locales/zh-TW'
import {
    flattenTranslatorToUiTranslations,
    formatUiMessage as t,
    pluralUiMessage as plural,
} from '../../i18n/ui-translations'

/**
 * Regression: the flat UI translation layer pre-evaluated the ICU "other"
 * plural form with a fixed `count: 2`, baking the literal "2" into strings
 * that use the ICU `#` token (filesSelected / uploadFiles / addFiles). The
 * components then can't interpolate the real count (formatUiMessage only
 * substitutes `{{count}}`), so ANY count !== 1 — including 0 — rendered as
 * "2 …". The "other" form must keep a `{{count}}` placeholder instead.
 */
describe('flattenTranslatorToUiTranslations — count-based plurals', () => {
    const tr = flattenTranslatorToUiTranslations(
        createTranslator({ bundle: enUS }),
    )

    const render = (key: string, count: number) =>
        t(plural(tr, key, count), { count })

    it('filesSelected reflects the real count', () => {
        expect(render('filesSelected', 1)).toBe('1 file selected')
        expect(render('filesSelected', 0)).toBe('0 files selected')
        expect(render('filesSelected', 3)).toBe('3 files selected')
        expect(render('filesSelected', 5)).toBe('5 files selected')
    })

    it('uploadFiles reflects the real count', () => {
        expect(render('uploadFiles', 1)).toBe('Upload 1 file')
        expect(render('uploadFiles', 4)).toBe('Upload 4 files')
    })

    it('addFiles reflects the real count', () => {
        expect(render('addFiles', 1)).toBe('Add 1 file')
        expect(render('addFiles', 7)).toBe('Add 7 files')
    })

    it('"other" forms keep the {{count}} placeholder, not a baked number', () => {
        expect(tr.filesSelected_other).toContain('{{count}}')
        expect(tr.filesSelected_other).not.toMatch(/\d/)
        expect(tr.uploadFiles_other).toContain('{{count}}')
        expect(tr.uploadFiles_other).not.toMatch(/\d/)
        expect(tr.addFiles_other).toContain('{{count}}')
        expect(tr.addFiles_other).not.toMatch(/\d/)
    })
})

/**
 * Contract guard across ALL shipped locales. `countPluralOther` assumes the
 * count is the first `\p{Nd}+` run in every count-bearing `_other` form, so it
 * swaps exactly that run for `{{count}}`. A future locale that prefixes a
 * literal digit before the count (e.g. "Top 3 of # files") would bind the
 * wrong number and silently regress. Lock the contract on every bundle: the
 * placeholder survives, no native digit (Latin or otherwise) is baked in, and
 * a real count renders through.
 */
describe('flattenTranslatorToUiTranslations — count plurals across all locales', () => {
    const bundles = [
        ['en-US', enUS],
        ['ar-SA', arSA],
        ['de-DE', deDE],
        ['es-ES', esES],
        ['fr-FR', frFR],
        ['ja-JP', jaJP],
        ['ko-KR', koKR],
        ['zh-CN', zhCN],
        ['zh-TW', zhTW],
    ] as const

    const countKeys = ['filesSelected', 'uploadFiles', 'addFiles'] as const

    it.each(bundles)(
        '%s keeps {{count}} (no baked digits) in every count plural',
        (_code, bundle) => {
            const tr = flattenTranslatorToUiTranslations(
                createTranslator({ bundle }),
            )
            for (const key of countKeys) {
                const other = tr[`${key}_other`]
                expect(other).toContain('{{count}}')
                // `\p{Nd}` covers non-Latin digit scripts (Arabic-Indic, etc.)
                expect(other).not.toMatch(/\p{Nd}/u)
                // and the real count interpolates for count !== 1
                expect(t(plural(tr, key, 4), { count: 4 })).toContain('4')
            }
        },
    )
})
