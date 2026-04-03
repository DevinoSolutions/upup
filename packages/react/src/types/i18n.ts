import type {
    LocaleBundle,
    PartialMessages,
    UpupLocaleCode,
    Translator,
} from '@upup/shared'

/**
 * The unified i18n prop for <UpupUploader>.
 *
 * Three modes:
 * 1. Minimal:     `i18n={{ locale: 'fr-FR' }}`
 * 2. Custom msgs: `i18n={{ locale: 'fr-FR', overrides: { common: { cancel: 'Non' } } }}`
 * 3. BYO:         `i18n={{ t: myTranslator }}`
 */
export type UpupI18nProp = UpupI18nConfig | UpupI18nByo

export interface UpupI18nConfig {
    /** BCP 47 locale code */
    locale?: UpupLocaleCode
    /** Full locale bundle (overrides built-in for that code) */
    bundle?: LocaleBundle
    /** Partial message overrides merged on top of the bundle */
    overrides?: PartialMessages
    /** Async loader for locale bundles not included in the JS bundle */
    loadLocale?: (code: string) => Promise<LocaleBundle>
    /** Called when a key is missing from all bundles */
    onMissingKey?: (key: string) => void
}

export interface UpupI18nByo {
    /** Bring-your-own translator function */
    t: Translator
}

export function isByoTranslator(i18n: UpupI18nProp): i18n is UpupI18nByo {
    return 't' in i18n && typeof i18n.t === 'function'
}
