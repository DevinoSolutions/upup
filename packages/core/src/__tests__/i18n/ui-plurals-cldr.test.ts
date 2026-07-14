import { describe, it, expect } from 'vitest'
import { createTranslator } from '../../i18n/create-translator'
import { enUS } from '../../i18n/locales/en-US'
import { frFR } from '../../i18n/locales/fr-FR'
import { arSA } from '../../i18n/locales/ar-SA'
import {
    flattenTranslatorToUiTranslations,
    formatUiMessage as t,
    pluralUiMessage as plural,
    type UiTranslations,
} from '../../i18n/ui-translations'
import type { LocaleBundle } from '../../i18n/types'

const flat = (b: LocaleBundle) =>
    flattenTranslatorToUiTranslations(createTranslator({ bundle: b }))
const render = (b: LocaleBundle, key: string, count: number, loc?: string) =>
    t(plural(flat(b), key, count, loc), { count })

describe('CLDR category selection (real Arabic cases, synthetic arms — no invented morphology)', () => {
    // ar-SA CLDR: 0=zero 1=one 2=two 3-10=few 11-99=many 100/101/102=other
    const syn = {
        x_zero: 'ZERO',
        x_one: 'ONE',
        x_two: 'TWO',
        x_few: 'FEW',
        x_many: 'MANY',
        x_other: 'OTHER',
    } as unknown as UiTranslations
    it.each([
        [0, 'ZERO'],
        [1, 'ONE'],
        [2, 'TWO'],
        [3, 'FEW'],
        [8, 'FEW'],
        [11, 'MANY'],
        [99, 'MANY'],
        [100, 'OTHER'],
    ])('ar-SA count %i selects %s', (n, exp) =>
        expect(plural(syn, 'x', n as number, 'ar-SA')).toBe(exp),
    )
})

describe('French singular/plural boundary is CLDR-correct (the visible fix)', () => {
    it('count 0 is SINGULAR in French (one = {0,1})', () =>
        expect(render(frFR, 'filesSelected', 0, 'fr-FR')).toBe(
            '0 fichier sélectionné',
        )) // was "0 fichiers sélectionnés"
    it('count 1 singular', () =>
        expect(render(frFR, 'filesSelected', 1, 'fr-FR')).toBe(
            '1 fichier sélectionné',
        ))
    it('count 2 plural', () =>
        expect(render(frFR, 'filesSelected', 2, 'fr-FR')).toBe(
            '2 fichiers sélectionnés',
        ))
})

describe('en-US unchanged; ar-SA real bundle falls back few→other until arms authored', () => {
    it('en-US 1/2/0', () => {
        expect(render(enUS, 'filesSelected', 1, 'en-US')).toBe(
            '1 file selected',
        )
        expect(render(enUS, 'filesSelected', 2, 'en-US')).toBe(
            '2 files selected',
        )
        expect(render(enUS, 'filesSelected', 0, 'en-US')).toBe(
            '0 files selected',
        )
    })
    it('ar-SA count 3 (few) gracefully renders the other-arm and interpolates the count', () => {
        const out = render(arSA, 'filesSelected', 3, 'ar-SA')
        expect(out).toContain('3') // count interpolates
        expect(out).not.toMatch(/\bfile\b/) // Arabic, not English
    })
})
