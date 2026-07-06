import type { UpupLocaleCode } from './types'
import { LOCALE_REGISTRY } from './locales/registry'

export interface LocaleMeta {
    code: UpupLocaleCode
    language: string
    dir: 'ltr' | 'rtl'
}

/**
 * Derived from LOCALE_REGISTRY \u2014 every bundle already carries `code`/
 * `language`/`dir`, so this projection can never drift from the registry.
 */
export const LOCALE_META: Record<string, LocaleMeta> = Object.fromEntries(
    Object.values(LOCALE_REGISTRY).map(bundle => [
        bundle.code,
        { code: bundle.code, language: bundle.language, dir: bundle.dir },
    ]),
)

/**
 * Normalize legacy underscore codes to BCP 47 hyphenated format.
 * e.g. "en_US" -> "en-US", "fr_FR" -> "fr-FR"
 */
export function normalizeBcp47(code: string): UpupLocaleCode {
    return code.replace(/_/g, '-')
}
