import type {
  UpupThemeConfig,
  UpupResolvedTheme,
  UpupThemeTokens,
  DeepPartial,
} from './types'
import type { UpupThemeSlots } from './slots'
import { lightPreset, darkPreset } from './presets'

/**
 * Deep-merge two objects. `overrides` values win.
 */
function deepMerge<T>(
  base: T,
  overrides: DeepPartial<T> | undefined,
): T {
  if (!overrides) return base
  const result = { ...base } as Record<string, unknown>
  const over = overrides as Record<string, unknown>
  for (const key of Object.keys(over)) {
    const val = over[key]
    if (
      val !== undefined &&
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as DeepPartial<Record<string, unknown>>,
      )
    } else if (val !== undefined) {
      result[key] = val
    }
  }
  return result as T
}

/**
 * Detect system preference (browser only).
 * Returns 'light' in non-browser environments.
 */
function detectSystemMode(): 'light' | 'dark' {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

/**
 * Resolve theme pipeline:
 *   1. Pick base preset from mode (light/dark/system)
 *   2. Deep-merge provider-level token overrides
 *   3. Deep-merge instance-level token overrides
 *
 * @param config   - Instance-level theme config (from `theme` prop)
 * @param providerTokens - Provider-level token overrides (from UpupThemeProvider)
 * @param providerSlots - Provider-level slot overrides (from UpupThemeProvider)
 */
export function resolveTheme(
  config?: UpupThemeConfig,
  providerTokens?: DeepPartial<UpupThemeTokens>,
  providerSlots?: DeepPartial<UpupThemeSlots>,
): UpupResolvedTheme {
  const mode = config?.mode ?? 'light'

  // Step 1: Pick base preset
  const effectiveMode = mode === 'system' ? detectSystemMode() : mode
  const base = effectiveMode === 'dark' ? darkPreset : lightPreset

  // Step 2: Merge provider tokens
  const withProvider = deepMerge(base, providerTokens)

  // Step 3: Merge instance tokens
  const final = deepMerge(withProvider, config?.tokens)

  // Merge slots: provider -> instance
  const mergedSlots = deepMerge<DeepPartial<UpupThemeSlots>>(
    providerSlots ?? {},
    config?.slots as DeepPartial<DeepPartial<UpupThemeSlots>> | undefined,
  )

  return { mode, tokens: final, slots: mergedSlots }
}
