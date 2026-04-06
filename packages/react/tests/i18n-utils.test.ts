import { describe, it, expect } from 'vitest'
import { t, plural, mergeTranslations } from '../src/shared/i18n/utils'
import { en_US } from '../src/shared/i18n'
import type { Translations } from '../src/shared/i18n/types'

// All locale packs
import { ar_SA } from '../src/shared/i18n/locales/ar_SA'
import { de_DE } from '../src/shared/i18n/locales/de_DE'
import { es_ES } from '../src/shared/i18n/locales/es_ES'
import { fr_FR } from '../src/shared/i18n/locales/fr_FR'
import { ja_JP } from '../src/shared/i18n/locales/ja_JP'
import { ko_KR } from '../src/shared/i18n/locales/ko_KR'
import { zh_CN } from '../src/shared/i18n/locales/zh_CN'
import { zh_TW } from '../src/shared/i18n/locales/zh_TW'

describe('t() interpolation', () => {
  it('returns template unchanged when no values', () => {
    expect(t('Hello world')).toBe('Hello world')
  })

  it('replaces single placeholder', () => {
    expect(t('Upload {{count}} files', { count: 5 })).toBe('Upload 5 files')
  })

  it('replaces multiple placeholders', () => {
    expect(t('{{name}} ({{size}} {{unit}})', { name: 'test.txt', size: 10, unit: 'MB' }))
      .toBe('test.txt (10 MB)')
  })

  it('preserves unmatched placeholders', () => {
    expect(t('Hello {{name}}, {{missing}}', { name: 'World' }))
      .toBe('Hello World, {{missing}}')
  })

  it('handles numeric values', () => {
    expect(t('Max {{size}} {{unit}}', { size: 999, unit: 'MB' }))
      .toBe('Max 999 MB')
  })

  it('handles empty values object', () => {
    expect(t('No placeholders', {})).toBe('No placeholders')
  })
})

describe('plural()', () => {
  it('returns _one variant for count=1', () => {
    const result = plural(en_US, 'uploadFiles', 1)
    expect(result).toBe(en_US.uploadFiles_one)
  })

  it('returns _other variant for count>1', () => {
    const result = plural(en_US, 'uploadFiles', 5)
    expect(result).toBe(en_US.uploadFiles_other)
  })

  it('returns _other variant for count=0', () => {
    const result = plural(en_US, 'uploadFiles', 0)
    expect(result).toBe(en_US.uploadFiles_other)
  })

  it('works with filesSelected key', () => {
    expect(plural(en_US, 'filesSelected', 1)).toBe(en_US.filesSelected_one)
    expect(plural(en_US, 'filesSelected', 3)).toBe(en_US.filesSelected_other)
  })

  it('works with addFiles key', () => {
    expect(plural(en_US, 'addFiles', 1)).toBe(en_US.addFiles_one)
    expect(plural(en_US, 'addFiles', 10)).toBe(en_US.addFiles_other)
  })
})

describe('mergeTranslations()', () => {
  it('returns base when overrides is undefined', () => {
    expect(mergeTranslations(en_US)).toBe(en_US)
  })

  it('returns base when overrides is empty', () => {
    const result = mergeTranslations(en_US, {})
    expect(result.cancel).toBe('Cancel')
  })

  it('overrides specific keys', () => {
    const result = mergeTranslations(en_US, { cancel: 'Annuler' })
    expect(result.cancel).toBe('Annuler')
    expect(result.done).toBe('Done') // unchanged
  })
})

describe('locale completeness', () => {
  const locales: Record<string, Translations> = {
    en_US, ar_SA, de_DE, es_ES, fr_FR, ja_JP, ko_KR, zh_CN, zh_TW,
  }
  const requiredKeys = Object.keys(en_US) as (keyof Translations)[]

  for (const [name, locale] of Object.entries(locales)) {
    it(`${name} has all required keys`, () => {
      for (const key of requiredKeys) {
        expect(locale[key], `${name} missing key: ${key}`).toBeDefined()
        expect(typeof locale[key], `${name}.${key} should be string`).toBe('string')
        expect(locale[key].length, `${name}.${key} should not be empty`).toBeGreaterThan(0)
      }
    })
  }

  it('all locales have same number of keys as en_US', () => {
    const expectedCount = requiredKeys.length
    for (const [name, locale] of Object.entries(locales)) {
      expect(Object.keys(locale).length, `${name} key count mismatch`).toBe(expectedCount)
    }
  })
})
