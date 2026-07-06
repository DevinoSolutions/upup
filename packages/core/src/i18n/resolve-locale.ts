import type {
    LocaleBundle,
    UpupLocaleCode,
    UpupMessages,
    MessageNamespace,
} from './types'
import type { RegisteredLocaleCode } from './locales/registry'
import { LOCALE_REGISTRY } from './locales/registry'
import { normalizeBcp47 } from './locale-meta'

const DEFAULT_LOCALE = 'en-US'

/**
 * Resolve a locale candidate to its LocaleBundle:
 *  - already a LocaleBundle object → returned as-is.
 *  - a registered BCP 47 string code (e.g. "fr-FR", or "fr_FR" via
 *    normalizeBcp47) → resolved from the registry.
 *  - anything else (undefined, an unregistered code) → undefined.
 */
export function resolveLocaleBundle(
    candidate: LocaleBundle | UpupLocaleCode | undefined,
): LocaleBundle | undefined {
    if (
        candidate &&
        typeof candidate === 'object' &&
        'code' in candidate &&
        'messages' in candidate
    ) {
        return candidate as LocaleBundle
    }
    if (typeof candidate === 'string') {
        const code = normalizeBcp47(candidate)
        return LOCALE_REGISTRY[code as RegisteredLocaleCode] ?? undefined
    }
    return undefined
}

/**
 * Build a fallback chain: fr-CA -> fr -> en-US
 */
export function buildFallbackChain(code: string): string[] {
    const chain: string[] = [code]

    // If code has a region (e.g. fr-CA), add the base language (e.g. fr)
    // Skip if the code IS the default locale (en-US → don't add 'en')
    if (code.includes('-') && code !== DEFAULT_LOCALE) {
        const base = code.split('-')[0]
        if (base !== undefined && base !== code) {
            chain.push(base)
        }
    }

    // Always fall back to en-US unless it's already in the chain
    if (!chain.includes(DEFAULT_LOCALE)) {
        chain.push(DEFAULT_LOCALE)
    }

    return chain
}

/**
 * Resolve a single message from a set of bundles using a fallback chain.
 */
export function resolveMessage(
    bundles: Map<string, LocaleBundle>,
    chain: string[],
    ns: MessageNamespace,
    key: string,
): string | undefined {
    for (const code of chain) {
        const bundle = bundles.get(code)
        if (!bundle) continue
        const nsObj = bundle.messages[ns] as unknown as
            | Record<string, string>
            | undefined
        if (nsObj && key in nsObj) {
            return nsObj[key]
        }
    }
    return undefined
}
