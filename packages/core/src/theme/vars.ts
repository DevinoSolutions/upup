import type { UpupThemeTokens } from './types'

export const UPUP_VAR_PREFIX = '--upup-'

/**
 * Convert camelCase to kebab-case.
 * e.g. "surfaceAlt" -> "surface-alt", "primaryHover" -> "primary-hover"
 */
function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
}

/**
 * Convert a full UpupThemeTokens object to a flat Record of CSS variable
 * assignments: { '--upup-color-surface': '#FFFFFF', ... }
 *
 * Suitable for passing to `style` attribute on root element.
 */
export function tokensToVars(
  tokens: UpupThemeTokens,
): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [group, groupTokens] of Object.entries(tokens)) {
    for (const [key, value] of Object.entries(
      groupTokens as Record<string, string>,
    )) {
      const varName = `${UPUP_VAR_PREFIX}${group}-${toKebab(key)}`
      vars[varName] = value
    }
  }

  return vars
}

/**
 * Generate a UpupThemeTokens-shaped object where each leaf is a
 * `var(--upup-<group>-<key>)` reference string.
 *
 * Used by slot recipes to reference tokens without knowing their values.
 */
export function tokensToVarRefs(): UpupThemeTokens {
  // Build proxy-like structure with known keys
  const groups = {
    color: [
      'surface', 'surfaceAlt', 'primary', 'primaryHover',
      'text', 'textMuted', 'border', 'borderActive',
      'danger', 'success', 'dragBg', 'overlay',
    ],
    radius: ['sm', 'md', 'lg', 'full'],
    shadow: ['sm', 'md', 'lg'],
    spacing: ['xs', 'sm', 'md', 'lg'],
  }

  const result: Record<string, Record<string, string>> = {}
  for (const [group, keys] of Object.entries(groups)) {
    result[group] = {}
    for (const key of keys) {
      result[group][key] = `var(${UPUP_VAR_PREFIX}${group}-${toKebab(key)})`
    }
  }

  return result as unknown as UpupThemeTokens
}
