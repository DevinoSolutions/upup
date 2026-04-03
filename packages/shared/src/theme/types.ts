import type { UpupThemeSlots } from './slots'

/** Individual color tokens for the upup theme */
export interface UpupColorTokens {
  /** Main surface background (e.g. uploader container) */
  surface: string
  /** Alternate surface (e.g. file list header/footer) */
  surfaceAlt: string
  /** Primary action color (buttons, links) */
  primary: string
  /** Primary hover state */
  primaryHover: string
  /** Main text color */
  text: string
  /** Muted/secondary text */
  textMuted: string
  /** Default border color */
  border: string
  /** Active/focused border color */
  borderActive: string
  /** Error/danger color */
  danger: string
  /** Success color */
  success: string
  /** Drag-over background */
  dragBg: string
  /** Overlay/backdrop color */
  overlay: string
}

export interface UpupRadiusTokens {
  sm: string
  md: string
  lg: string
  full: string
}

export interface UpupShadowTokens {
  sm: string
  md: string
  lg: string
}

export interface UpupSpacingTokens {
  xs: string
  sm: string
  md: string
  lg: string
}

export interface UpupThemeTokens {
  color: UpupColorTokens
  radius: UpupRadiusTokens
  shadow: UpupShadowTokens
  spacing: UpupSpacingTokens
}

export type UpupThemeMode = 'light' | 'dark' | 'system'

/**
 * Full theme configuration object.
 * Users can pass partial overrides; resolveTheme() fills in defaults.
 */
export interface UpupThemeConfig {
  /** 'light' | 'dark' | 'system' — controls which preset to use as base */
  mode?: UpupThemeMode
  /** Partial token overrides applied on top of the mode preset */
  tokens?: DeepPartial<UpupThemeTokens>
  /** Per-component slot class overrides (replaces old classNames prop) */
  slots?: DeepPartial<UpupThemeSlots>
}

/** Resolved theme — all tokens are guaranteed present */
export interface UpupResolvedTheme {
  mode: UpupThemeMode
  tokens: UpupThemeTokens
  slots: DeepPartial<UpupThemeSlots>
}

// Utility type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
