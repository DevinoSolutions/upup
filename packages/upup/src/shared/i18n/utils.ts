import type { Translations } from './types'

/**
 * Interpolate `{{key}}` placeholders in a translation string.
 *
 * @example
 * t('Upload {{count}} files', { count: 3 })
 * // → "Upload 3 files"
 */
export function t(
    template: string,
    values?: Record<string, string | number>,
): string {
    if (!values) return template
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
        String(values[key] ?? `{{${key}}}`),
    )
}

/**
 * Pick the correct plural form for a translation key.
 *
 * Given a base key (e.g. `"uploadFiles"`) and a count, this returns
 * the `_one` variant when count === 1 and `_other` otherwise.
 *
 * @example
 * plural(translations, 'uploadFiles', 3)
 * // → translations.uploadFiles_other  ("Upload {{count}} files")
 */
export function plural(
    translations: Translations,
    baseKey: string,
    count: number,
): string {
    const suffix = count === 1 ? '_one' : '_other'
    const key = `${baseKey}${suffix}` as keyof Translations
    return (
        translations[key] ?? translations[baseKey as keyof Translations] ?? ''
    )
}

/**
 * Deep-merge a partial translations override onto a base locale.
 * Only top-level keys are merged (the object is flat by design).
 */
export function mergeTranslations(
    base: Translations,
    overrides?: Partial<Translations>,
): Translations {
    if (!overrides) return base
    return { ...base, ...overrides }
}
