import { describe, it, expect } from 'vitest'
import { en_US, mergeTranslations } from '../src/shared/i18n'
import type { Translations } from '../src/shared/i18n/types'

describe('i18n prop resolution', () => {
  it('uses en_US as default locale when no i18n provided', () => {
    const locale = undefined
    const localePack = undefined
    const resolved = locale ?? localePack ?? en_US
    expect(resolved).toBe(en_US)
    expect(resolved.cancel).toBe('Cancel')
    expect(resolved.done).toBe('Done')
  })

  it('i18n.locale takes precedence over localePack', () => {
    const customLocale = { ...en_US, cancel: 'Annuler', done: 'Terminé' }
    const localePack = { ...en_US, cancel: 'Abbrechen' }

    // Simulates: i18n?.locale ?? localePack ?? en_US
    const i18n = { locale: customLocale }
    const resolved = i18n.locale ?? localePack ?? en_US
    expect(resolved.cancel).toBe('Annuler')
  })

  it('localePack is used when i18n.locale is undefined', () => {
    const localePack = { ...en_US, cancel: 'Abbrechen' }
    const i18n: { locale?: Translations } = {}
    const resolved = i18n.locale ?? localePack ?? en_US
    expect(resolved.cancel).toBe('Abbrechen')
  })

  it('mergeTranslations returns base when no overrides', () => {
    const result = mergeTranslations(en_US)
    expect(result).toBe(en_US)
  })

  it('mergeTranslations applies partial overrides', () => {
    const overrides: Partial<Translations> = { cancel: 'Cancelar', done: 'Hecho' }
    const result = mergeTranslations(en_US, overrides)
    expect(result.cancel).toBe('Cancelar')
    expect(result.done).toBe('Hecho')
    // Non-overridden keys remain from base
    expect(result.loading).toBe(en_US.loading)
    expect(result.browseFiles).toBe(en_US.browseFiles)
  })

  it('i18n.overrides takes precedence over translations prop', () => {
    const translationOverrides: Partial<Translations> = { cancel: 'From translations prop' }
    const i18n = { overrides: { cancel: 'From i18n.overrides' } as Partial<Translations> }

    // Simulates: i18n?.overrides ?? translationOverrides
    const resolvedOverrides = i18n.overrides ?? translationOverrides
    const result = mergeTranslations(en_US, resolvedOverrides)
    expect(result.cancel).toBe('From i18n.overrides')
  })

  it('falls back to translations prop when i18n.overrides is undefined', () => {
    const translationOverrides: Partial<Translations> = { cancel: 'From translations prop' }
    const i18n: { overrides?: Partial<Translations> } = {}

    const resolvedOverrides = i18n.overrides ?? translationOverrides
    const result = mergeTranslations(en_US, resolvedOverrides)
    expect(result.cancel).toBe('From translations prop')
  })
})
