// ── New namespaced locale packs (BCP 47 hyphenated) ──────────
export { enUS } from './locales/en-US'
export { arSA } from './locales/ar-SA'
export { deDE } from './locales/de-DE'
export { esES } from './locales/es-ES'
export { frFR } from './locales/fr-FR'
export { jaJP } from './locales/ja-JP'
export { koKR } from './locales/ko-KR'
export { zhCN } from './locales/zh-CN'
export { zhTW } from './locales/zh-TW'

// ── Types ────────────────────────────────────────────────────
export type {
    UpupMessages,
    LocaleBundle,
    UpupLocaleCode,
    FlatMessageKey,
    PartialMessages,
    MessageNamespace,
    Translator,
} from './types'

// ── Utilities ────────────────────────────────────────────────
export { createTranslator, type TranslatorOptions } from './create-translator'
export { buildFallbackChain, resolveMessage, resolveLocaleBundle } from './resolve-locale'
export { LOCALE_META, normalizeBcp47, type LocaleMeta } from './locale-meta'
export {
    flattenTranslatorToUiTranslations,
    formatUiMessage,
    pluralUiMessage,
    type Translations,
    type UiTranslations,
} from './ui-translations'

export { mergeTranslations, plural, t } from './utils'
export { errorCodeToMessageKey } from './error-code-map'
