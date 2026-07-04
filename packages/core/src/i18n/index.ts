// ── Locale registry (single source of truth — see locales/registry.ts) ──
export * from './locales/registry'

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
export {
    buildFallbackChain,
    resolveMessage,
    resolveLocaleBundle,
} from './resolve-locale'
export { LOCALE_META, normalizeBcp47, type LocaleMeta } from './locale-meta'
export {
    flattenTranslatorToUiTranslations,
    formatUiMessage,
    pluralUiMessage,
    type Translations,
    type UiTranslations,
} from './ui-translations'

export { errorCodeToMessageKey } from './error-code-map'
