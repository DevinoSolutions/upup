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

// ── Legacy locale exports (deprecated, remove in v3) ─────────
export { en_US } from './en_US'
export { ar_SA } from './locales/ar_SA'
export { de_DE } from './locales/de_DE'
export { es_ES } from './locales/es_ES'
export { fr_FR } from './locales/fr_FR'
export { ja_JP } from './locales/ja_JP'
export { ko_KR } from './locales/ko_KR'
export { zh_CN } from './locales/zh_CN'
export { zh_TW } from './locales/zh_TW'

// ── Types ────────────────────────────────────────────────────
export type {
    UpupMessages,
    LocaleBundle,
    UpupLocaleCode,
    FlatMessageKey,
    PartialMessages,
    MessageNamespace,
    Translator,
    Translations,
} from './types'

// ── Utilities ────────────────────────────────────────────────
export { createTranslator, type TranslatorOptions } from './create-translator'
export { buildFallbackChain, resolveMessage } from './resolve-locale'
export { LOCALE_META, normalizeBcp47, type LocaleMeta } from './locale-meta'

// ── Legacy utils (deprecated, remove in v3) ──────────────────
export { mergeTranslations, plural, t } from './utils'
