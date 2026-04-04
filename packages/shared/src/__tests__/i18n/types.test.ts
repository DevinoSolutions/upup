import { describe, it, expectTypeOf } from 'vitest'
import type {
    UpupMessages,
    LocaleBundle,
    UpupLocaleCode,
    FlatMessageKey,
    Translator,
} from '../../i18n/types'

describe('UpupMessages type', () => {
    it('has required namespace objects', () => {
        expectTypeOf<UpupMessages>().toHaveProperty('common')
        expectTypeOf<UpupMessages>().toHaveProperty('header')
        expectTypeOf<UpupMessages>().toHaveProperty('dropzone')
        expectTypeOf<UpupMessages>().toHaveProperty('fileList')
        expectTypeOf<UpupMessages>().toHaveProperty('filePreview')
        expectTypeOf<UpupMessages>().toHaveProperty('driveBrowser')
        expectTypeOf<UpupMessages>().toHaveProperty('url')
        expectTypeOf<UpupMessages>().toHaveProperty('camera')
        expectTypeOf<UpupMessages>().toHaveProperty('audio')
        expectTypeOf<UpupMessages>().toHaveProperty('screenCapture')
        expectTypeOf<UpupMessages>().toHaveProperty('branding')
        expectTypeOf<UpupMessages>().toHaveProperty('errors')
    })

    it('common namespace has expected keys', () => {
        expectTypeOf<UpupMessages['common']>().toHaveProperty('cancel')
        expectTypeOf<UpupMessages['common']>().toHaveProperty('done')
        expectTypeOf<UpupMessages['common']>().toHaveProperty('loading')
    })

    it('all values are strings', () => {
        expectTypeOf<UpupMessages['common']['cancel']>().toEqualTypeOf<string>()
    })
})

describe('LocaleBundle type', () => {
    it('has metadata and messages', () => {
        expectTypeOf<LocaleBundle>().toHaveProperty('code')
        expectTypeOf<LocaleBundle>().toHaveProperty('language')
        expectTypeOf<LocaleBundle>().toHaveProperty('dir')
        expectTypeOf<LocaleBundle>().toHaveProperty('messages')
    })

    it('code is UpupLocaleCode', () => {
        expectTypeOf<LocaleBundle['code']>().toEqualTypeOf<UpupLocaleCode>()
    })

    it('dir is ltr or rtl', () => {
        expectTypeOf<LocaleBundle['dir']>().toEqualTypeOf<'ltr' | 'rtl'>()
    })
})

describe('FlatMessageKey type', () => {
    it('produces dot-notation keys', () => {
        type Keys = FlatMessageKey
        expectTypeOf<'common.cancel'>().toMatchTypeOf<Keys>()
        expectTypeOf<'errors.uploadFailed'>().toMatchTypeOf<Keys>()
        expectTypeOf<'camera.capture'>().toMatchTypeOf<Keys>()
    })
})

describe('Translator type', () => {
    it('is callable with key and optional values', () => {
        expectTypeOf<Translator>().toBeCallableWith('common.cancel' as FlatMessageKey)
        expectTypeOf<Translator>().toBeCallableWith(
            'errors.uploadFailed' as FlatMessageKey,
            { message: 'timeout' },
        )
    })

    it('has locale and dir properties', () => {
        expectTypeOf<Translator>().toHaveProperty('locale')
        expectTypeOf<Translator>().toHaveProperty('dir')
    })
})
