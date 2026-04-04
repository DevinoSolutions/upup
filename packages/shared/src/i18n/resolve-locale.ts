import type { LocaleBundle, UpupMessages, MessageNamespace } from './types'

const DEFAULT_LOCALE = 'en-US'

/**
 * Build a fallback chain: fr-CA -> fr -> en-US
 */
export function buildFallbackChain(code: string): string[] {
    const chain: string[] = [code]

    // If code has a region (e.g. fr-CA), add the base language (e.g. fr)
    // Skip if the code IS the default locale (en-US → don't add 'en')
    if (code.includes('-') && code !== DEFAULT_LOCALE) {
        const base = code.split('-')[0]
        if (base !== code) {
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
        const nsObj = bundle.messages[ns] as unknown as Record<string, string> | undefined
        if (nsObj && key in nsObj) {
            return nsObj[key]
        }
    }
    return undefined
}
