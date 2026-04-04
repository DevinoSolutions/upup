import type { UpupLocaleCode } from './types'

export interface LocaleMeta {
    code: UpupLocaleCode
    language: string
    dir: 'ltr' | 'rtl'
}

export const LOCALE_META: Record<string, LocaleMeta> = {
    'en-US': { code: 'en-US', language: 'English', dir: 'ltr' },
    'ar-SA': { code: 'ar-SA', language: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', dir: 'rtl' },
    'de-DE': { code: 'de-DE', language: 'Deutsch', dir: 'ltr' },
    'es-ES': { code: 'es-ES', language: 'Espa\u00F1ol', dir: 'ltr' },
    'fr-FR': { code: 'fr-FR', language: 'Fran\u00E7ais', dir: 'ltr' },
    'ja-JP': { code: 'ja-JP', language: '\u65E5\u672C\u8A9E', dir: 'ltr' },
    'ko-KR': { code: 'ko-KR', language: '\uD55C\uAD6D\uC5B4', dir: 'ltr' },
    'zh-CN': { code: 'zh-CN', language: '\u4E2D\u6587(\u7B80\u4F53)', dir: 'ltr' },
    'zh-TW': { code: 'zh-TW', language: '\u4E2D\u6587(\u7E41\u9AD4)', dir: 'ltr' },
}

/**
 * Normalize legacy underscore codes to BCP 47 hyphenated format.
 * e.g. "en_US" -> "en-US", "fr_FR" -> "fr-FR"
 */
export function normalizeBcp47(code: string): UpupLocaleCode {
    return code.replace(/_/g, '-') as UpupLocaleCode
}
