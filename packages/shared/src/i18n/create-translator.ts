import IntlMessageFormat from 'intl-messageformat'
import type {
    LocaleBundle,
    FlatMessageKey,
    PartialMessages,
    MessageNamespace,
    Translator,
} from './types'

export interface TranslatorOptions {
    /** Primary locale bundle */
    bundle: LocaleBundle
    /** Fallback bundle (typically en-US) */
    fallback?: LocaleBundle
    /** Partial message overrides merged on top */
    overrides?: PartialMessages
    /** Called when a key is missing from all sources */
    onMissingKey?: (key: string) => void
    /** Async loader for switching locale at runtime */
    loadLocale?: (code: string) => Promise<LocaleBundle>
}

/**
 * Create a translator function with ICU MessageFormat support,
 * formatter caching, and a fallback chain.
 */
export function createTranslator(options: TranslatorOptions): Translator {
    let { bundle } = options
    const { fallback, overrides, onMissingKey, loadLocale } = options

    // ── Formatter cache ─────────────────────────────────────────
    const cache = new Map<string, IntlMessageFormat>()
    const MAX_CACHE = 500

    function getFormatter(
        pattern: string,
        locale: string,
    ): IntlMessageFormat {
        const cacheKey = `${locale}:${pattern}`
        let fmt = cache.get(cacheKey)
        if (!fmt) {
            if (cache.size >= MAX_CACHE) {
                // Evict oldest entry
                const first = cache.keys().next().value
                if (first) cache.delete(first)
            }
            fmt = new IntlMessageFormat(pattern, locale)
            cache.set(cacheKey, fmt)
        }
        return fmt
    }

    // ── Message resolution ──────────────────────────────────────

    function resolvePattern(key: string): string | undefined {
        const [ns, msgKey] = key.split('.', 2) as [MessageNamespace, string]

        // 1. Check user overrides first
        if (overrides?.[ns]) {
            const val = (overrides[ns] as Record<string, string>)?.[msgKey]
            if (val) return val
        }

        // 2. Primary bundle
        const nsObj = bundle.messages[ns]
        if (nsObj) {
            const val = (nsObj as unknown as Record<string, string>)[msgKey]
            if (val) return val
        }

        // 3. Fallback bundle
        if (fallback) {
            const fbNs = fallback.messages[ns]
            if (fbNs) {
                const val = (fbNs as unknown as Record<string, string>)[msgKey]
                if (val) return val
            }
        }

        return undefined
    }

    // ── Translator function ─────────────────────────────────────

    const t: Translator = Object.assign(
        function translate(
            key: FlatMessageKey,
            values?: Record<string, unknown>,
        ): string {
            const pattern = resolvePattern(key)

            if (!pattern) {
                onMissingKey?.(key)
                return key
            }

            // Fast path: no values and no ICU syntax -> return raw string
            if (!values && !pattern.includes('{')) {
                return pattern
            }

            try {
                const fmt = getFormatter(pattern, bundle.code)
                return fmt.format(values) as string
            } catch {
                // If ICU parsing fails, fall back to raw pattern
                return pattern
            }
        },
        {
            get locale() {
                return bundle.code
            },
            get dir() {
                return bundle.dir
            },
            setLocale: loadLocale
                ? async (code: string) => {
                      const newBundle = await loadLocale(code)
                      bundle = newBundle
                      cache.clear()
                  }
                : undefined,
        },
    )

    return t
}
