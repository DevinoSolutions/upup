import { describe, it, expect } from 'vitest'
import { enUS } from '../../i18n/locales/en-US'
import { arSA } from '../../i18n/locales/ar-SA'
import { deDE } from '../../i18n/locales/de-DE'
import { esES } from '../../i18n/locales/es-ES'
import { frFR } from '../../i18n/locales/fr-FR'
import { jaJP } from '../../i18n/locales/ja-JP'
import { koKR } from '../../i18n/locales/ko-KR'
import { zhCN } from '../../i18n/locales/zh-CN'
import { zhTW } from '../../i18n/locales/zh-TW'
import type { LocaleBundle } from '../../i18n/types'

const bundles: { name: string; bundle: LocaleBundle }[] = [
    { name: 'ar-SA', bundle: arSA },
    { name: 'de-DE', bundle: deDE },
    { name: 'es-ES', bundle: esES },
    { name: 'fr-FR', bundle: frFR },
    { name: 'ja-JP', bundle: jaJP },
    { name: 'ko-KR', bundle: koKR },
    { name: 'zh-CN', bundle: zhCN },
    { name: 'zh-TW', bundle: zhTW },
]

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
