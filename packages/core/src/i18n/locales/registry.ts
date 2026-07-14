import type { LocaleBundle } from '../types'
import { enUS } from './en-US'
import { arSA } from './ar-SA'
import { deDE } from './de-DE'
import { esES } from './es-ES'
import { frFR } from './fr-FR'
import { jaJP } from './ja-JP'
import { koKR } from './ko-KR'
import { zhCN } from './zh-CN'
import { zhTW } from './zh-TW'

/**
 * THE locale registration list. To add a locale:
 *   1. create ./<code>.ts exporting its bundle,
 *   2. add the import above,
 *   3. add the code to LOCALE_CODES AND the bundle to LOCALE_REGISTRY below,
 *   4. add the identifier to the re-export line.
 * The `Record<RegisteredLocaleCode, LocaleBundle>` annotation makes TS reject a
 * code without a bundle (TS2741) or a bundle without a code (TS2353) — the
 * missing compiler cross-check F-401 identified.
 */
export const LOCALE_CODES = [
    'en-US',
    'ar-SA',
    'de-DE',
    'es-ES',
    'fr-FR',
    'ja-JP',
    'ko-KR',
    'zh-CN',
    'zh-TW',
] as const

export type RegisteredLocaleCode = (typeof LOCALE_CODES)[number]

export const LOCALE_REGISTRY: Record<RegisteredLocaleCode, LocaleBundle> = {
    'en-US': enUS,
    'ar-SA': arSA,
    'de-DE': deDE,
    'es-ES': esES,
    'fr-FR': frFR,
    'ja-JP': jaJP,
    'ko-KR': koKR,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
}

// Named bundle re-exports kept public (consumed by core.ts, options, react,
// apps, and the docs `import { jaJP } from '@upupjs/core/i18n'` example).
export { enUS, arSA, deDE, esES, frFR, jaJP, koKR, zhCN, zhTW }
