import { describe, it, expect } from 'vitest'
import { ar_SA } from '../../i18n/locales/ar_SA'
import { de_DE } from '../../i18n/locales/de_DE'
import { es_ES } from '../../i18n/locales/es_ES'
import { fr_FR } from '../../i18n/locales/fr_FR'
import { ja_JP } from '../../i18n/locales/ja_JP'
import { ko_KR } from '../../i18n/locales/ko_KR'
import { zh_CN } from '../../i18n/locales/zh_CN'
import { zh_TW } from '../../i18n/locales/zh_TW'
import { arSA } from '../../i18n/locales/ar-SA'
import { deDE } from '../../i18n/locales/de-DE'
import { esES } from '../../i18n/locales/es-ES'
import { frFR } from '../../i18n/locales/fr-FR'
import { jaJP } from '../../i18n/locales/ja-JP'
import { koKR } from '../../i18n/locales/ko-KR'
import { zhCN } from '../../i18n/locales/zh-CN'
import { zhTW } from '../../i18n/locales/zh-TW'

const LEGACY_PAIRS = [
    { legacy: ar_SA, canonical: arSA, code: 'ar_SA' },
    { legacy: de_DE, canonical: deDE, code: 'de_DE' },
    { legacy: es_ES, canonical: esES, code: 'es_ES' },
    { legacy: fr_FR, canonical: frFR, code: 'fr_FR' },
    { legacy: ja_JP, canonical: jaJP, code: 'ja_JP' },
    { legacy: ko_KR, canonical: koKR, code: 'ko_KR' },
    { legacy: zh_CN, canonical: zhCN, code: 'zh_CN' },
    { legacy: zh_TW, canonical: zhTW, code: 'zh_TW' },
] as const

// ─────────────────────────────────────────────
// Each legacy export is the canonical .messages object
// ─────────────────────────────────────────────
describe.each(LEGACY_PAIRS)('$code legacy re-export', ({ legacy, canonical, code }) => {
    it(`${code} is referentially equal to canonical .messages`, () => {
        expect(legacy).toBe(canonical.messages)
    })

    it(`${code} has a common namespace`, () => {
        expect(legacy).toHaveProperty('common')
    })

    it(`${code} has an adapters namespace`, () => {
        expect(legacy).toHaveProperty('adapters')
    })

    it(`${code} has an errors namespace`, () => {
        expect(legacy).toHaveProperty('errors')
    })
})
