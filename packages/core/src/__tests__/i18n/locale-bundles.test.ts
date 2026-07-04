import { describe, it, expect } from 'vitest'
import { LOCALE_REGISTRY, LOCALE_CODES } from '../../i18n/locales/registry'
import type { UpupMessages } from '../../i18n/types'

const enUS = LOCALE_REGISTRY['en-US']
const arSA = LOCALE_REGISTRY['ar-SA']

// No `as const` needed here (unlike the plan's literal snippet): LocaleBundle.dir
// is already the literal union 'ltr' | 'rtl' at its source in types.ts, so
// `.dir` off a LOCALE_REGISTRY lookup is never widened to `string` in the first
// place — `as const` on a .map() result is a TS1355 (only literals qualify).
const ALL_LOCALES = LOCALE_CODES
    .filter(c => c !== 'en-US')
    .map(code => ({ code, bundle: LOCALE_REGISTRY[code], dir: LOCALE_REGISTRY[code].dir }))

const REQUIRED_NAMESPACES: (keyof UpupMessages)[] = [
    'common',
    'sources',
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
describe.each(
    LOCALE_CODES
        .filter(c => /^(ja|ko|zh)/.test(c))
        .map(code => ({ code, bundle: LOCALE_REGISTRY[code] })),
)('$code non-ASCII content', ({ bundle, code }) => {
    it(`${code} language name contains non-ASCII characters`, () => {
        expect(/[^\x00-\x7F]/.test(bundle.language)).toBe(true)
    })
})
