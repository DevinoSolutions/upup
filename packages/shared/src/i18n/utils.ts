import type { UpupMessages } from './types'

/**
 * @deprecated Use `createTranslator()` instead. Will be removed in v3.
 *
 * Interpolate `{{key}}` placeholders in a translation string.
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
 * @deprecated Use `createTranslator()` with ICU plural syntax instead. Will be removed in v3.
 *
 * Pick the correct plural form for a translation key.
 */
export function plural(
    translations: UpupMessages,
    baseKey: string,
    count: number,
): string {
    const suffix = count === 1 ? '_one' : '_other'
    const key = `${baseKey}${suffix}`
    const flat = translations as unknown as Record<string, string>
    return flat[key] ?? flat[baseKey] ?? ''
}

/**
 * @deprecated Use `createTranslator()` with overrides instead. Will be removed in v3.
 *
 * Deep-merge a partial translations override onto a base locale.
 */
export function mergeTranslations(
    base: UpupMessages,
    overrides?: Partial<UpupMessages>,
): UpupMessages {
    if (!overrides) return base
    const result = { ...base } as Record<string, unknown>
    for (const key of Object.keys(overrides)) {
        const baseNs = (base as unknown as Record<string, unknown>)[key]
        const overrideNs = (overrides as unknown as Record<string, unknown>)[key]
        if (
            baseNs &&
            typeof baseNs === 'object' &&
            overrideNs &&
            typeof overrideNs === 'object'
        ) {
            result[key] = { ...baseNs, ...overrideNs }
        } else if (overrideNs !== undefined) {
            result[key] = overrideNs
        }
    }
    return result as unknown as UpupMessages
}
