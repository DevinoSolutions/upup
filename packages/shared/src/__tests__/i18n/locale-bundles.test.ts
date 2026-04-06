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
import type { UpupMessages } from '../../i18n/types'

const ALL_LOCALES = [
    { bundle: arSA, code: 'ar-SA', dir: 'rtl' },
    { bundle: deDE, code: 'de-DE', dir: 'ltr' },
    { bundle: esES, code: 'es-ES', dir: 'ltr' },
    { bundle: frFR, code: 'fr-FR', dir: 'ltr' },
    { bundle: jaJP, code: 'ja-JP', dir: 'ltr' },
    { bundle: koKR, code: 'ko-KR', dir: 'ltr' },
    { bundle: zhCN, code: 'zh-CN', dir: 'ltr' },
    { bundle: zhTW, code: 'zh-TW', dir: 'ltr' },
] as const

const REQUIRED_NAMESPACES: (keyof UpupMessages)[] = [
    'common',
    'adapters',
    'dropzone',
    'header',
    'fileList',
    'filePreview',
    'driveBrowser',
    'url',
    'camera',
    'audio',
    'screenCapture',
    'branding',
    'errors',
]

function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = []
    for (const [key, val] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (typeof val === 'string') keys.push(path)
        else if (typeof val === 'object' && val !== null)
            keys.push(...getLeafKeys(val as Record<string, unknown>, path))
    }
    return keys
}

const enLeafKeys = getLeafKeys(enUS.messages as unknown as Record<string, unknown>)

// ─────────────────────────────────────────────
// Metadata for every non-English locale
// ─────────────────────────────────────────────
describe.each(ALL_LOCALES)('$code metadata', ({ bundle, code, dir }) => {
    it('code field matches expected code', () => {
        expect(bundle.code).toBe(code)
    })

    it('dir field matches expected direction', () => {
        expect(bundle.dir).toBe(dir)
    })

    it('language field is non-empty', () => {
        expect(bundle.language.length).toBeGreaterThan(0)
    })
})

// ─────────────────────────────────────────────
// Namespace completeness
// ─────────────────────────────────────────────
describe.each(ALL_LOCALES)('$code namespace completeness', ({ bundle, code }) => {
    it(`${code} has all required namespaces`, () => {
        for (const ns of REQUIRED_NAMESPACES) {
            expect(bundle.messages, `namespace "${ns}" missing from ${code}`).toHaveProperty(ns)
        }
    })
})

// ─────────────────────────────────────────────
// Leaf key completeness vs en-US
// ─────────────────────────────────────────────
describe.each(ALL_LOCALES)('$code key completeness vs en-US', ({ bundle, code }) => {
    it(`${code} has all leaf keys present in en-US`, () => {
        const localeKeys = getLeafKeys(bundle.messages as unknown as Record<string, unknown>)
        const localeKeySet = new Set(localeKeys)
        const missing = enLeafKeys.filter(k => !localeKeySet.has(k))
        expect(missing, `${code} is missing keys: ${missing.join(', ')}`).toHaveLength(0)
    })
})

// ─────────────────────────────────────────────
// ar-SA specific — RTL and Arabic script
// ─────────────────────────────────────────────
describe('ar-SA specific', () => {
    it('is marked as RTL', () => {
        expect(arSA.dir).toBe('rtl')
    })

    it('language name contains Arabic characters', () => {
        // Arabic Unicode range starts at \u0600
        expect(/[\u0600-\u06FF]/.test(arSA.language)).toBe(true)
    })
})

// ─────────────────────────────────────────────
// CJK locales — non-ASCII characters present
// ─────────────────────────────────────────────
describe.each([
    { bundle: jaJP, code: 'ja-JP' },
    { bundle: koKR, code: 'ko-KR' },
    { bundle: zhCN, code: 'zh-CN' },
    { bundle: zhTW, code: 'zh-TW' },
])('$code non-ASCII content', ({ bundle, code }) => {
    it(`${code} language name contains non-ASCII characters`, () => {
        expect(/[^\x00-\x7F]/.test(bundle.language)).toBe(true)
    })
})
