import { describe, it, expect } from 'vitest'
import { LOCALE_REGISTRY, LOCALE_CODES } from '../../i18n/locales/registry'
import type { LocaleBundle } from '../../i18n/types'

const enUS = LOCALE_REGISTRY['en-US']
const arSA = LOCALE_REGISTRY['ar-SA']

const bundles: { name: string; bundle: LocaleBundle }[] = LOCALE_CODES
    .filter(c => c !== 'en-US')
    .map(name => ({ name, bundle: LOCALE_REGISTRY[name] }))

const enNamespaces = Object.keys(enUS.messages) as (keyof typeof enUS.messages)[]

describe.each(bundles)('$name locale consistency', ({ name, bundle }) => {
    it(`${name} has code, language, and dir`, () => {
        expect(typeof bundle.code).toBe('string')
        expect(bundle.code.length).toBeGreaterThan(0)
        expect(typeof bundle.language).toBe('string')
        expect(['ltr', 'rtl']).toContain(bundle.dir)
    })

    it(`${name} has all en-US namespaces`, () => {
        for (const ns of enNamespaces) {
            expect(bundle.messages, `missing namespace: ${ns}`).toHaveProperty(ns)
        }
    })

    it(`${name} common.cancel is a non-empty string`, () => {
        expect(typeof bundle.messages.common.cancel).toBe('string')
        expect(bundle.messages.common.cancel.length).toBeGreaterThan(0)
    })
})

describe('ar-SA specific', () => {
    it('has dir=rtl', () => {
        expect(arSA.dir).toBe('rtl')
    })

    it('cancel is in Arabic', () => {
        expect(arSA.messages.common.cancel).not.toBe('Cancel') // not English
    })
})
