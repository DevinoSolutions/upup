import { describe, it, expect } from 'vitest'
import { t, plural, mergeTranslations } from '../src/shared/i18n/utils'
import type { Translations } from '../src/shared/i18n/types'

const baseMessages = {
  cancel: 'Cancel',
  done: 'Done',
  uploadFiles_one: 'Upload 1 file',
  uploadFiles_other: 'Upload {{count}} files',
  filesSelected_one: '1 file selected',
  filesSelected_other: '{{count}} files selected',
  addFiles_one: 'Add 1 file',
  addFiles_other: 'Add {{count}} files',
} as Translations

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
    const result = plural(baseMessages, 'uploadFiles', 1)
    expect(result).toBe(baseMessages.uploadFiles_one)
  })

  it('returns _other variant for count>1', () => {
    const result = plural(baseMessages, 'uploadFiles', 5)
    expect(result).toBe(baseMessages.uploadFiles_other)
  })

  it('returns _other variant for count=0', () => {
    const result = plural(baseMessages, 'uploadFiles', 0)
    expect(result).toBe(baseMessages.uploadFiles_other)
  })

  it('works with filesSelected key', () => {
    expect(plural(baseMessages, 'filesSelected', 1)).toBe(baseMessages.filesSelected_one)
    expect(plural(baseMessages, 'filesSelected', 3)).toBe(baseMessages.filesSelected_other)
  })

  it('works with addFiles key', () => {
    expect(plural(baseMessages, 'addFiles', 1)).toBe(baseMessages.addFiles_one)
    expect(plural(baseMessages, 'addFiles', 10)).toBe(baseMessages.addFiles_other)
  })
})

describe('mergeTranslations()', () => {
  it('returns base when overrides is undefined', () => {
    expect(mergeTranslations(baseMessages)).toBe(baseMessages)
  })

  it('returns base when overrides is empty', () => {
    const result = mergeTranslations(baseMessages, {})
    expect(result.cancel).toBe('Cancel')
  })

  it('overrides specific keys', () => {
    const result = mergeTranslations(baseMessages, { cancel: 'Annuler' })
    expect(result.cancel).toBe('Annuler')
    expect(result.done).toBe('Done') // unchanged
  })
})
