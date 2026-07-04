import { describe, it, expect, vi } from 'vitest'
import { resolveLocaleBundle } from '../src/i18n/resolve-locale'
import type { LocaleBundle } from '../src/i18n/types'
import { normalizeUploaderOptions } from '../src/uploader/normalize-options'
import * as createTranslatorModule from '../src/i18n/create-translator'
import { UpupCore } from '../src/core'

const frFR: LocaleBundle = {
  code: 'fr-FR',
  language: 'Français',
  dir: 'ltr',
  messages: {} as LocaleBundle['messages'],
}

describe('resolveLocaleBundle', () => {
  it('returns the candidate when it is already a LocaleBundle object', () => {
    expect(resolveLocaleBundle(frFR)).toBe(frFR)
  })

  it('returns undefined for a string locale code', () => {
    expect(resolveLocaleBundle('fr-FR')).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(resolveLocaleBundle(undefined)).toBeUndefined()
  })
})

describe('normalizeUploaderOptions forwards locale to coreOptions', () => {
  it('forwards the resolved bundle to coreOptions.locale when i18n.bundle is set', () => {
    const { coreOptions } = normalizeUploaderOptions({ i18n: { bundle: frFR } })
    expect(coreOptions.locale).toBe(frFR)
  })

  it('leaves coreOptions.locale undefined when no i18n option is passed', () => {
    const { coreOptions } = normalizeUploaderOptions({})
    expect(coreOptions.locale).toBeUndefined()
  })
})

describe('pipeline translator honours CoreOptions.locale', () => {
  it('builds the pipeline translator from options.locale when set', async () => {
    const spy = vi.spyOn(createTranslatorModule, 'createTranslator')
    const core = new UpupCore({
      locale: frFR,
      uploadEndpoint: 'https://example.test/upload',
      checksumVerification: true,
    })
    await core.setFiles([])
    try {
      await core.upload()
    } catch {
      /* no files / network — expected in this unit test */
    }
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ bundle: frFR }))
    core.destroy()
    spy.mockRestore()
  })
})
