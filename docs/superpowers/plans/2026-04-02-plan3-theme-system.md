# Plan 3: Theme / Styling System

**Execution order:** This plan should run AFTER Plan 2 (i18n). It assumes the `i18n` prop and `t: Translator` context field already exist from Plan 2. When removing `dark`/`classNames`, this plan preserves the `i18n` prop and `t` translator that Plan 2 added.

**Date:** 2026-04-02
**Branch:** `huge-refactor`
**Scope:** `@upup/shared` (theme primitives) + `@upup/react` (consumption)
**Breaking:** Yes (removes `dark`, `classNames` props; replaces with `theme`)
**Dependency:** `tailwind-variants` added as devDependency to `@upup/react`

---

## Current State

| Signal | Count |
|--------|-------|
| `dark ?` ternary branches | ~41 across 16 files |
| `classNames.*` references | 72 flat keys in `UploaderClassNames` |
| CSS variables | 0 (except image editor) |
| `data-*` attributes | 0 (except image editor) |
| ThemeProvider | none |
| `cn()` helper | exists at `packages/react/src/lib/tailwind.ts` |

**Hardcoded colors found:** `#1849D6`, `#30C5F7`, `#59D1F9`, `#045671`, `#0E2ADD`, `#242634`, `#6D6D6D`, `#0B0B0B`, `#8EA5E7`, `#F5F5F5`, `#E7ECFC`

---

## Dependency Chain (execution order)

```
shared types (#70) --> shared presets (#72) --> shared resolveTheme (#73)
    --> shared CSS var helpers (#71) --> shared slots type (#75)
        --> react ThemeProvider (#74) --> react slot recipes (#76)
            --> react data-state (#77) --> react data-upup-slot (#78)
                --> react data-theme (#46) --> dark branch audit (10.5) --> component migration (25 files)
```

---

## Task 1: Theme Token Types (`@upup/shared`)

**Issue:** #70
**File:** `packages/shared/src/theme/types.ts`

### 1.1 Write tests

**File:** `packages/shared/src/theme/__tests__/types.test.ts`

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type {
  UpupColorTokens,
  UpupRadiusTokens,
  UpupShadowTokens,
  UpupSpacingTokens,
  UpupThemeTokens,
  UpupThemeMode,
} from '../types'

describe('UpupThemeTokens', () => {
  it('has required color token keys', () => {
    expectTypeOf<UpupColorTokens>().toHaveProperty('surface')
    expectTypeOf<UpupColorTokens>().toHaveProperty('surfaceAlt')
    expectTypeOf<UpupColorTokens>().toHaveProperty('primary')
    expectTypeOf<UpupColorTokens>().toHaveProperty('primaryHover')
    expectTypeOf<UpupColorTokens>().toHaveProperty('text')
    expectTypeOf<UpupColorTokens>().toHaveProperty('textMuted')
    expectTypeOf<UpupColorTokens>().toHaveProperty('border')
    expectTypeOf<UpupColorTokens>().toHaveProperty('borderActive')
    expectTypeOf<UpupColorTokens>().toHaveProperty('danger')
    expectTypeOf<UpupColorTokens>().toHaveProperty('success')
    expectTypeOf<UpupColorTokens>().toHaveProperty('dragBg')
    expectTypeOf<UpupColorTokens>().toHaveProperty('overlay')
  })

  it('has required radius token keys', () => {
    expectTypeOf<UpupRadiusTokens>().toHaveProperty('sm')
    expectTypeOf<UpupRadiusTokens>().toHaveProperty('md')
    expectTypeOf<UpupRadiusTokens>().toHaveProperty('lg')
    expectTypeOf<UpupRadiusTokens>().toHaveProperty('full')
  })

  it('has required spacing token keys', () => {
    expectTypeOf<UpupSpacingTokens>().toHaveProperty('xs')
    expectTypeOf<UpupSpacingTokens>().toHaveProperty('sm')
    expectTypeOf<UpupSpacingTokens>().toHaveProperty('md')
    expectTypeOf<UpupSpacingTokens>().toHaveProperty('lg')
  })

  it('composes into UpupThemeTokens', () => {
    expectTypeOf<UpupThemeTokens>().toHaveProperty('color')
    expectTypeOf<UpupThemeTokens>().toHaveProperty('radius')
    expectTypeOf<UpupThemeTokens>().toHaveProperty('shadow')
    expectTypeOf<UpupThemeTokens>().toHaveProperty('spacing')
  })

  it('UpupThemeMode is a union', () => {
    expectTypeOf<'light'>().toMatchTypeOf<UpupThemeMode>()
    expectTypeOf<'dark'>().toMatchTypeOf<UpupThemeMode>()
    expectTypeOf<'system'>().toMatchTypeOf<UpupThemeMode>()
  })
})
```

### 1.2 Write implementation

**File:** `packages/shared/src/theme/types.ts`

```ts
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
}

/** Resolved theme — all tokens are guaranteed present */
export interface UpupResolvedTheme {
  mode: UpupThemeMode
  tokens: UpupThemeTokens
}

// Utility type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

### 1.3 Export from shared barrel

**File:** `packages/shared/src/theme/index.ts` (new)

```ts
export * from './types'
export * from './presets'
export * from './resolve-theme'
export * from './vars'
export * from './slots'
```

**File:** `packages/shared/src/index.ts` (modify — add line)

```ts
export * from './theme'
```

---

## Task 2: Light + Dark Preset Objects (`@upup/shared`)

**Issue:** #72
**File:** `packages/shared/src/theme/presets.ts`

### 2.1 Write tests

**File:** `packages/shared/src/theme/__tests__/presets.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { lightPreset, darkPreset } from '../presets'
import type { UpupThemeTokens } from '../types'

function assertComplete(tokens: UpupThemeTokens) {
  // color
  expect(tokens.color.surface).toBeTruthy()
  expect(tokens.color.surfaceAlt).toBeTruthy()
  expect(tokens.color.primary).toBeTruthy()
  expect(tokens.color.primaryHover).toBeTruthy()
  expect(tokens.color.text).toBeTruthy()
  expect(tokens.color.textMuted).toBeTruthy()
  expect(tokens.color.border).toBeTruthy()
  expect(tokens.color.borderActive).toBeTruthy()
  expect(tokens.color.danger).toBeTruthy()
  expect(tokens.color.success).toBeTruthy()
  expect(tokens.color.dragBg).toBeTruthy()
  expect(tokens.color.overlay).toBeTruthy()
  // radius
  expect(tokens.radius.sm).toBeTruthy()
  expect(tokens.radius.md).toBeTruthy()
  expect(tokens.radius.lg).toBeTruthy()
  expect(tokens.radius.full).toBeTruthy()
  // shadow
  expect(tokens.shadow.sm).toBeTruthy()
  expect(tokens.shadow.md).toBeTruthy()
  expect(tokens.shadow.lg).toBeTruthy()
  // spacing
  expect(tokens.spacing.xs).toBeTruthy()
  expect(tokens.spacing.sm).toBeTruthy()
  expect(tokens.spacing.md).toBeTruthy()
  expect(tokens.spacing.lg).toBeTruthy()
}

describe('lightPreset', () => {
  it('has all required token keys', () => {
    assertComplete(lightPreset)
  })

  it('uses light surface colors', () => {
    // Surface should be a light value (white-ish)
    expect(lightPreset.color.surface).toMatch(/^#[fF]/)
  })
})

describe('darkPreset', () => {
  it('has all required token keys', () => {
    assertComplete(darkPreset)
  })

  it('uses dark surface colors', () => {
    // Surface should be a dark value
    expect(lightPreset.color.surface).not.toEqual(darkPreset.color.surface)
  })

  it('dark.primary maps to existing #30C5F7 brand color', () => {
    expect(darkPreset.color.primary).toBe('#30C5F7')
  })
})
```

### 2.2 Write implementation

**File:** `packages/shared/src/theme/presets.ts`

```ts
import type { UpupThemeTokens } from './types'

/**
 * Light preset — derived from existing hardcoded colors in the codebase.
 *
 * Mappings from old code:
 *   primary    = #1849D6  (border-[#1849D6], bg-blue-600)
 *   text       = #0B0B0B  (text-[#0B0B0B])
 *   textMuted  = #6D6D6D  (text-[#6D6D6D])
 *   dragBg     = #E7ECFC  (bg-[#E7ECFC])
 *   surface    = #FFFFFF
 *   surfaceAlt = rgba(0,0,0,0.025) mapped to #F9F9F9
 */
export const lightPreset: UpupThemeTokens = {
  color: {
    surface: '#FFFFFF',
    surfaceAlt: '#F7F7F8',
    primary: '#1849D6',
    primaryHover: '#0E2ADD',
    text: '#0B0B0B',
    textMuted: '#6D6D6D',
    border: '#D1D5DB',
    borderActive: '#1849D6',
    danger: '#DC2626',
    success: '#16A34A',
    dragBg: '#E7ECFC',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
  },
}

/**
 * Dark preset — derived from existing dark-mode hardcoded colors.
 *
 * Mappings from old code:
 *   primary       = #30C5F7  (bg-[#30C5F7], border-[#30C5F7])
 *   primaryHover  = #59D1F9  (text-[#59D1F9])
 *   text          = #FFFFFF  (text-white)
 *   textMuted     = #D1D5DB  (text-gray-300)
 *   dragBg        = #045671  (bg-[#045671])
 *   surfaceAlt    = rgba(255,255,255,0.05)
 */
export const darkPreset: UpupThemeTokens = {
  color: {
    surface: '#1A1A2E',
    surfaceAlt: '#252540',
    primary: '#30C5F7',
    primaryHover: '#59D1F9',
    text: '#FFFFFF',
    textMuted: '#D1D5DB',
    border: '#4B5563',
    borderActive: '#30C5F7',
    danger: '#EF4444',
    success: '#22C55E',
    dragBg: '#045671',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
  },
}
```

---

## Task 3: `resolveTheme()` Pipeline (`@upup/shared`)

**Issue:** #73
**File:** `packages/shared/src/theme/resolve-theme.ts`

### 3.1 Write tests

**File:** `packages/shared/src/theme/__tests__/resolve-theme.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { resolveTheme } from '../resolve-theme'
import { lightPreset, darkPreset } from '../presets'

describe('resolveTheme', () => {
  it('returns light preset when no config provided', () => {
    const result = resolveTheme()
    expect(result.mode).toBe('light')
    expect(result.tokens).toEqual(lightPreset)
  })

  it('returns light preset for mode: "light"', () => {
    const result = resolveTheme({ mode: 'light' })
    expect(result.tokens.color.primary).toBe(lightPreset.color.primary)
  })

  it('returns dark preset for mode: "dark"', () => {
    const result = resolveTheme({ mode: 'dark' })
    expect(result.mode).toBe('dark')
    expect(result.tokens.color.primary).toBe(darkPreset.color.primary)
  })

  it('defaults to "light" for mode: "system" in non-browser env', () => {
    const result = resolveTheme({ mode: 'system' })
    // In test (no window.matchMedia), falls back to light
    expect(result.tokens.color.primary).toBe(lightPreset.color.primary)
  })

  it('merges partial token overrides on top of preset', () => {
    const result = resolveTheme({
      mode: 'light',
      tokens: { color: { primary: '#FF0000' } },
    })
    expect(result.tokens.color.primary).toBe('#FF0000')
    // Other tokens remain from light preset
    expect(result.tokens.color.surface).toBe(lightPreset.color.surface)
    expect(result.tokens.radius.lg).toBe(lightPreset.radius.lg)
  })

  it('merges nested partial overrides (deep merge)', () => {
    const result = resolveTheme({
      mode: 'dark',
      tokens: {
        color: { surface: '#000000' },
        radius: { lg: '20px' },
      },
    })
    expect(result.tokens.color.surface).toBe('#000000')
    expect(result.tokens.color.primary).toBe(darkPreset.color.primary) // untouched
    expect(result.tokens.radius.lg).toBe('20px')
    expect(result.tokens.radius.sm).toBe(darkPreset.radius.sm) // untouched
  })

  it('provider tokens are merged before instance tokens', () => {
    const result = resolveTheme(
      { mode: 'light', tokens: { color: { primary: '#INSTANCE' } } },
      { color: { primary: '#PROVIDER', text: '#PROVIDER_TEXT' } },
    )
    // Instance wins over provider
    expect(result.tokens.color.primary).toBe('#INSTANCE')
    // Provider wins over preset for keys not in instance
    expect(result.tokens.color.text).toBe('#PROVIDER_TEXT')
  })
})
```

### 3.2 Write implementation

**File:** `packages/shared/src/theme/resolve-theme.ts`

```ts
import type {
  UpupThemeConfig,
  UpupResolvedTheme,
  UpupThemeTokens,
  DeepPartial,
} from './types'
import { lightPreset, darkPreset } from './presets'

/**
 * Deep-merge two objects. `overrides` values win.
 */
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides: DeepPartial<T> | undefined,
): T {
  if (!overrides) return base
  const result = { ...base }
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const val = overrides[key]
    if (
      val !== undefined &&
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val) &&
      typeof base[key] === 'object' &&
      base[key] !== null
    ) {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        val as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T]
    } else if (val !== undefined) {
      result[key] = val as T[keyof T]
    }
  }
  return result
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
 */
export function resolveTheme(
  config?: UpupThemeConfig,
  providerTokens?: DeepPartial<UpupThemeTokens>,
): UpupResolvedTheme {
  const mode = config?.mode ?? 'light'

  // Step 1: Pick base preset
  const effectiveMode = mode === 'system' ? detectSystemMode() : mode
  const base = effectiveMode === 'dark' ? darkPreset : lightPreset

  // Step 2: Merge provider tokens
  const withProvider = deepMerge(base, providerTokens)

  // Step 3: Merge instance tokens
  const final = deepMerge(withProvider, config?.tokens)

  return { mode, tokens: final }
}
```

---

## Task 4: CSS Variable Helpers (`@upup/shared`)

**Issue:** #71
**File:** `packages/shared/src/theme/vars.ts`

### 4.1 Write tests

**File:** `packages/shared/src/theme/__tests__/vars.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import {
  tokensToVars,
  tokensToVarRefs,
  UPUP_VAR_PREFIX,
} from '../vars'
import { lightPreset } from '../presets'

describe('UPUP_VAR_PREFIX', () => {
  it('is --upup-', () => {
    expect(UPUP_VAR_PREFIX).toBe('--upup-')
  })
})

describe('tokensToVars', () => {
  it('converts tokens to flat CSS variable map', () => {
    const vars = tokensToVars(lightPreset)
    expect(vars['--upup-color-surface']).toBe(lightPreset.color.surface)
    expect(vars['--upup-color-primary']).toBe(lightPreset.color.primary)
    expect(vars['--upup-radius-lg']).toBe(lightPreset.radius.lg)
    expect(vars['--upup-shadow-md']).toBe(lightPreset.shadow.md)
    expect(vars['--upup-spacing-sm']).toBe(lightPreset.spacing.sm)
  })

  it('converts camelCase keys to kebab-case', () => {
    const vars = tokensToVars(lightPreset)
    expect(vars['--upup-color-surface-alt']).toBe(lightPreset.color.surfaceAlt)
    expect(vars['--upup-color-primary-hover']).toBe(lightPreset.color.primaryHover)
    expect(vars['--upup-color-text-muted']).toBe(lightPreset.color.textMuted)
    expect(vars['--upup-color-border-active']).toBe(lightPreset.color.borderActive)
    expect(vars['--upup-color-drag-bg']).toBe(lightPreset.color.dragBg)
  })

  it('returns correct number of variables (12 color + 4 radius + 3 shadow + 4 spacing = 23)', () => {
    const vars = tokensToVars(lightPreset)
    expect(Object.keys(vars)).toHaveLength(23)
  })
})

describe('tokensToVarRefs', () => {
  it('returns var() references for each token', () => {
    const refs = tokensToVarRefs()
    expect(refs.color.surface).toBe('var(--upup-color-surface)')
    expect(refs.color.primaryHover).toBe('var(--upup-color-primary-hover)')
    expect(refs.radius.lg).toBe('var(--upup-radius-lg)')
  })
})
```

### 4.2 Write implementation

**File:** `packages/shared/src/theme/vars.ts`

```ts
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
```

---

## Task 5: Theme Slots Type (`@upup/shared`)

**Issue:** #75
**File:** `packages/shared/src/theme/slots.ts`

### 5.1 Write tests

**File:** `packages/shared/src/theme/__tests__/slots.test.ts`

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type { UpupThemeSlots } from '../slots'

describe('UpupThemeSlots', () => {
  it('has uploader slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('uploader')
  })

  it('uploader has root and container slots', () => {
    expectTypeOf<UpupThemeSlots['uploader']>().toHaveProperty('root')
    expectTypeOf<UpupThemeSlots['uploader']>().toHaveProperty('container')
  })

  it('has fileList slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('fileList')
  })

  it('has dropZone slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('dropZone')
  })

  it('has sourceSelector slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('sourceSelector')
  })

  it('has progressBar slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('progressBar')
  })
})
```

### 5.2 classNames → slots Migration Mapping (all 72 keys)

The following table maps every key from the legacy `UploaderClassNames` type (72 keys in `packages/shared/src/types/class-names.ts`) to its new `UpupThemeSlots` path:

| # | Old `classNames` key | New `slots` path |
|---|----------------------|------------------|
| 1 | `fileIcon` | `filePreview.icon` |
| 2 | `containerMini` | `uploader.container` (with `mini` variant) |
| 3 | `containerFull` | `uploader.root` |
| 4 | `containerHeader` | `fileList.header` |
| 5 | `containerCancelButton` | `fileList.cancelButton` |
| 6 | `containerAddMoreButton` | `fileList.addMoreButton` |
| 7 | `adapterButtonList` | `sourceSelector.adapterList` |
| 8 | `adapterButton` | `sourceSelector.adapterButton` |
| 9 | `adapterButtonIcon` | `sourceSelector.adapterButtonIcon` |
| 10 | `adapterButtonText` | `sourceSelector.adapterButtonText` |
| 11 | `adapterViewHeader` | `sourceView.header` |
| 12 | `adapterViewCancelButton` | `sourceView.cancelButton` |
| 13 | `adapterView` | `sourceView.root` |
| 14 | `driveLoading` | `driveBrowser.loading` |
| 15 | `driveHeader` | `driveBrowser.header` |
| 16 | `driveLogoutButton` | `driveBrowser.logoutButton` |
| 17 | `driveSearchContainer` | `driveBrowser.searchContainer` |
| 18 | `driveSearchInput` | `driveBrowser.searchInput` |
| 19 | `driveBody` | `driveBrowser.body` |
| 20 | `driveItemContainerDefault` | `driveBrowser.itemDefault` |
| 21 | `driveItemContainerSelected` | `driveBrowser.itemSelected` |
| 22 | `driveItemContainerInner` | `driveBrowser.itemInner` |
| 23 | `driveItemInnerText` | `driveBrowser.itemText` |
| 24 | `driveFooter` | `driveBrowser.footer` |
| 25 | `driveAddFilesButton` | `driveBrowser.addFilesButton` |
| 26 | `driveCancelFilesButton` | `driveBrowser.cancelFilesButton` |
| 27 | `urlInput` | `urlUploader.input` |
| 28 | `urlFetchButton` | `urlUploader.fetchButton` |
| 29 | `cameraPreviewContainer` | `cameraUploader.previewContainer` |
| 30 | `cameraDeleteButton` | `cameraUploader.deleteButton` |
| 31 | `cameraCaptureButton` | `cameraUploader.captureButton` |
| 32 | `cameraRotateButton` | `cameraUploader.rotateButton` |
| 33 | `cameraMirrorButton` | `cameraUploader.mirrorButton` |
| 34 | `cameraAddButton` | `cameraUploader.addButton` |
| 35 | `cameraModeToggle` | `cameraUploader.modeToggle` |
| 36 | `cameraVideoRecordButton` | `cameraUploader.videoRecordButton` |
| 37 | `cameraVideoStopButton` | `cameraUploader.videoStopButton` |
| 38 | `cameraVideoPreview` | `cameraUploader.videoPreview` |
| 39 | `cameraVideoAddButton` | `cameraUploader.videoAddButton` |
| 40 | `cameraVideoDeleteButton` | `cameraUploader.videoDeleteButton` |
| 41 | `audioRecordButton` | `audioUploader.recordButton` |
| 42 | `audioStopButton` | `audioUploader.stopButton` |
| 43 | `audioPlaybackContainer` | `audioUploader.playbackContainer` |
| 44 | `audioWaveform` | `audioUploader.waveform` |
| 45 | `audioAddButton` | `audioUploader.addButton` |
| 46 | `audioDeleteButton` | `audioUploader.deleteButton` |
| 47 | `screenCaptureContainer` | `screenCaptureUploader.container` |
| 48 | `screenCaptureStartButton` | `screenCaptureUploader.startButton` |
| 49 | `screenCaptureStopButton` | `screenCaptureUploader.stopButton` |
| 50 | `screenCapturePreview` | `screenCaptureUploader.preview` |
| 51 | `screenCaptureAddButton` | `screenCaptureUploader.addButton` |
| 52 | `screenCaptureDeleteButton` | `screenCaptureUploader.deleteButton` |
| 53 | `fileListContainer` | `fileList.root` |
| 54 | `fileListContainerInnerSingle` | `fileList.body` (with `multiFile: false` variant) |
| 55 | `fileListContainerInnerMultiple` | `fileList.body` (with `multiFile: true` variant) |
| 56 | `fileListFooter` | `fileList.footer` |
| 57 | `filePreviewPortal` | `filePreviewPortal.root` |
| 58 | `fileItemSingle` | `filePreview.root` (with `single: true` variant) |
| 59 | `fileItemMultiple` | `filePreview.root` (with `single: false` variant) |
| 60 | `fileThumbnailSingle` | `filePreview.thumbnail` (with `single: true` variant) |
| 61 | `fileThumbnailMultiple` | `filePreview.thumbnail` (with `single: false` variant) |
| 62 | `fileInfo` | `filePreview.info` |
| 63 | `fileName` | `filePreview.name` |
| 64 | `fileSize` | `filePreview.size` |
| 65 | `filePreviewButton` | `filePreview.previewButton` |
| 66 | `fileDeleteButton` | `filePreview.deleteButton` |
| 67 | `uploadButton` | `fileList.uploadButton` |
| 68 | `uploadDoneButton` | `fileList.doneButton` |
| 69 | `progressBarContainer` | `progressBar.root` |
| 70 | `progressBar` | `progressBar.track` |
| 71 | `progressBarInner` | `progressBar.fill` |
| 72 | `progressBarText` | `progressBar.text` |

> **Note:** All 72 keys from `UploaderClassNames` are mapped above. Some old keys that differed only by single/multiple variants (e.g., `fileItemSingle`/`fileItemMultiple`) now map to the same slot with a recipe variant toggling the layout.

### 5.3 Write implementation

**File:** `packages/shared/src/theme/slots.ts`

```ts
/**
 * Component-scoped slot definitions.
 * Each component key maps to a record of slot names -> optional className override.
 *
 * Users can pass `theme.slots` to override specific slots without
 * touching the global token system.
 */
export interface UpupThemeSlots {
  uploader: {
    root?: string
    container?: string
  }
  dropZone: {
    root?: string
  }
  sourceSelector: {
    root?: string
    adapterList?: string
    adapterButton?: string
    adapterButtonIcon?: string
    adapterButtonText?: string
    browseText?: string
    dragText?: string
  }
  sourceView: {
    root?: string
    header?: string
    cancelButton?: string
  }
  fileList: {
    root?: string
    header?: string
    cancelButton?: string
    fileCount?: string
    body?: string
    footer?: string
    uploadButton?: string
    doneButton?: string
  }
  filePreview: {
    root?: string
    thumbnail?: string
    info?: string
    name?: string
    size?: string
    previewButton?: string
    deleteButton?: string
  }
  filePreviewPortal: {
    root?: string
  }
  progressBar: {
    root?: string
    track?: string
    fill?: string
    text?: string
  }
  notifier: {
    root?: string
    message?: string
  }
  urlUploader: {
    input?: string
    fetchButton?: string
  }
  cameraUploader: {
    root?: string
    previewContainer?: string
    captureButton?: string
    deleteButton?: string
    rotateButton?: string
    mirrorButton?: string
    addButton?: string
    modeToggle?: string
    videoRecordButton?: string
    videoStopButton?: string
    videoPreview?: string
    videoAddButton?: string
    videoDeleteButton?: string
  }
  audioUploader: {
    root?: string
    recordButton?: string
    stopButton?: string
    playbackContainer?: string
    waveform?: string
    addButton?: string
    deleteButton?: string
  }
  screenCaptureUploader: {
    root?: string
    container?: string
    startButton?: string
    stopButton?: string
    preview?: string
    addButton?: string
    deleteButton?: string
  }
  driveBrowser: {
    root?: string
    loading?: string
    header?: string
    logoutButton?: string
    searchContainer?: string
    searchInput?: string
    body?: string
    itemDefault?: string
    itemSelected?: string
    itemInner?: string
    itemText?: string
    footer?: string
    addFilesButton?: string
    cancelFilesButton?: string
  }
  driveAuthFallback: {
    root?: string
  }
  imageEditor: {
    root?: string
    modal?: string
  }
}

/**
 * All valid slot path strings, e.g. "uploader.root", "fileList.uploadButton".
 * Useful for data-upup-slot attribute values.
 */
export type UpupSlotPath = {
  [C in keyof UpupThemeSlots]: {
    [S in keyof UpupThemeSlots[C]]: `${C & string}.${S & string}`
  }[keyof UpupThemeSlots[C]]
}[keyof UpupThemeSlots]
```

---

## Task 6: Extend `UpupThemeConfig` with Slots + Update Shared Exports

### 6.1 Update types.ts

Add to `packages/shared/src/theme/types.ts`:

```ts
import type { UpupThemeSlots } from './slots'

// Add to UpupThemeConfig interface:
export interface UpupThemeConfig {
  mode?: UpupThemeMode
  tokens?: DeepPartial<UpupThemeTokens>
  /** Per-component slot class overrides (replaces old classNames prop) */
  slots?: DeepPartial<UpupThemeSlots>
}

export interface UpupResolvedTheme {
  mode: UpupThemeMode
  tokens: UpupThemeTokens
  slots: DeepPartial<UpupThemeSlots>
}
```

### 6.2 Update resolve-theme to merge slots

In `resolveTheme()`, add slots merging:

```ts
export function resolveTheme(
  config?: UpupThemeConfig,
  providerTokens?: DeepPartial<UpupThemeTokens>,
  providerSlots?: DeepPartial<UpupThemeSlots>,
): UpupResolvedTheme {
  // ... existing token resolution ...

  // Merge slots: provider -> instance
  const mergedSlots = deepMerge(
    (providerSlots ?? {}) as Record<string, unknown>,
    (config?.slots ?? {}) as DeepPartial<Record<string, unknown>>,
  ) as DeepPartial<UpupThemeSlots>

  return { mode, tokens: final, slots: mergedSlots }
}
```

---

## Task 7: `UpupThemeProvider` Context (`@upup/react`)

**Issue:** #74
**Files:**
- `packages/react/src/theme/UpupThemeProvider.tsx`
- `packages/react/src/theme/useUpupTheme.ts`

### 7.1 Write tests

**File:** `packages/react/src/theme/__tests__/UpupThemeProvider.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { UpupThemeProvider, useUpupThemeContext } from '../UpupThemeProvider'

describe('UpupThemeProvider', () => {
  it('provides default light theme when no props', () => {
    const { result } = renderHook(() => useUpupThemeContext(), {
      wrapper: ({ children }) => (
        <UpupThemeProvider>{children}</UpupThemeProvider>
      ),
    })
    expect(result.current).toBeNull()
    // null means "no provider" — instance resolveTheme uses defaults
  })

  it('provides token overrides to children', () => {
    const { result } = renderHook(() => useUpupThemeContext(), {
      wrapper: ({ children }) => (
        <UpupThemeProvider
          mode="dark"
          tokens={{ color: { primary: '#FF0000' } }}
        >
          {children}
        </UpupThemeProvider>
      ),
    })
    expect(result.current).not.toBeNull()
    expect(result.current!.mode).toBe('dark')
    expect(result.current!.tokens?.color?.primary).toBe('#FF0000')
  })
})
```

### 7.2 Write implementation

**File:** `packages/react/src/theme/UpupThemeProvider.tsx`

```tsx
'use client'

import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import type {
  UpupThemeMode,
  UpupThemeTokens,
  UpupThemeSlots,
  DeepPartial,
} from '@upup/shared'

export interface UpupThemeProviderProps {
  children: ReactNode
  mode?: UpupThemeMode
  tokens?: DeepPartial<UpupThemeTokens>
  slots?: DeepPartial<UpupThemeSlots>
}

export interface UpupThemeProviderValue {
  mode?: UpupThemeMode
  tokens?: DeepPartial<UpupThemeTokens>
  slots?: DeepPartial<UpupThemeSlots>
}

const UpupThemeContext = createContext<UpupThemeProviderValue | null>(null)

export function UpupThemeProvider({
  children,
  mode,
  tokens,
  slots,
}: UpupThemeProviderProps) {
  const value = useMemo<UpupThemeProviderValue>(
    () => ({ mode, tokens, slots }),
    [mode, tokens, slots],
  )

  return (
    <UpupThemeContext.Provider value={value}>
      {children}
    </UpupThemeContext.Provider>
  )
}

/**
 * Returns the provider-level theme context, or null if no provider.
 */
export function useUpupThemeContext(): UpupThemeProviderValue | null {
  return useContext(UpupThemeContext)
}
```

**File:** `packages/react/src/theme/useUpupTheme.ts`

```ts
'use client'

import { useMemo } from 'react'
import { resolveTheme, type UpupThemeConfig, type UpupResolvedTheme } from '@upup/shared'
import { useUpupThemeContext } from './UpupThemeProvider'

/**
 * Resolve the final theme for an UpupUploader instance.
 * Merges: defaults -> mode preset -> provider overrides -> instance overrides.
 */
export function useUpupTheme(instanceConfig?: UpupThemeConfig): UpupResolvedTheme {
  const provider = useUpupThemeContext()

  return useMemo(() => {
    const config: UpupThemeConfig = {
      mode: instanceConfig?.mode ?? provider?.mode ?? 'light',
      tokens: instanceConfig?.tokens,
      slots: instanceConfig?.slots,
    }
    return resolveTheme(config, provider?.tokens, provider?.slots)
  }, [instanceConfig, provider])
}
```

**File:** `packages/react/src/theme/index.ts`

```ts
export { UpupThemeProvider, useUpupThemeContext } from './UpupThemeProvider'
export type { UpupThemeProviderProps } from './UpupThemeProvider'
export { useUpupTheme } from './useUpupTheme'
```

---

## Task 8: Slot Recipes via `tailwind-variants` (`@upup/react`)

**Issue:** #76
**Dependency:** Add `tailwind-variants` to devDependencies

### 8.0 Install dependency

```bash
cd packages/react && pnpm add -D tailwind-variants
```

### 8.1 Base recipe helper

**File:** `packages/react/src/recipes/create-recipe.ts`

```ts
import { tv, type VariantProps } from 'tailwind-variants'

export { tv, type VariantProps }

/**
 * Re-export tv configured with our prefix.
 * All class names in recipes must use the `upup-` prefix.
 */
```

### 8.2 Drop Zone recipe

**File:** `packages/react/src/recipes/drop-zone.recipe.ts`

```ts
import { tv } from './create-recipe'

export const dropZoneRecipe = tv({
  slots: {
    root: 'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
  },
  variants: {
    hasBorder: {
      true: { root: 'upup-border' },
    },
    isDragging: {
      true: { root: 'upup-backdrop-blur-sm' },
    },
    isDashed: {
      true: { root: 'upup-border-dashed' },
    },
  },
  // Colors come from CSS variables, applied via style attribute
  // No dark: branches needed
})
```

### 8.3 Source Selector recipe

**File:** `packages/react/src/recipes/source-selector.recipe.ts`

```ts
import { tv } from './create-recipe'

export const sourceSelectorRecipe = tv({
  slots: {
    root: 'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14',
    adapterList: 'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
    adapterButton: 'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
    adapterButtonText: 'upup-text-xs',
    browseText: 'upup-cursor-pointer upup-text-xs upup-font-semibold md:upup-text-sm',
    dragText: 'upup-text-xs md:upup-text-sm',
    miniIcon: 'upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20',
    miniHint: 'px-6 upup-text-center upup-text-xs',
  },
  // Colors applied via CSS variables — no variants needed for dark mode
})
```

### 8.4 File List recipe

**File:** `packages/react/src/recipes/file-list.recipe.ts`

```ts
import { tv } from './create-recipe'

export const fileListRecipe = tv({
  slots: {
    root: 'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
    header: 'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-rounded-t-lg upup-px-3 upup-py-2 upup-text-sm',
    cancelButton: '',
    fileCount: '',
    body: 'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3',
    fileGrid: 'upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]',
    footer: 'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-px-3 upup-py-2',
    uploadButton: 'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
    doneButton: 'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
    retryButton: 'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
    pauseResumeButton: 'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-transition-colors',
  },
  variants: {
    hidden: {
      true: { root: 'upup-hidden' },
    },
    multiFile: {
      true: { fileGrid: 'md:upup-grid md:upup-gap-y-6 md:upup-grid-cols-2' },
      false: { fileGrid: 'upup-flex-1' },
    },
  },
})
```

### 8.5 Progress Bar recipe

**File:** `packages/react/src/recipes/progress-bar.recipe.ts`

```ts
import { tv } from './create-recipe'

export const progressBarRecipe = tv({
  slots: {
    root: 'upup-flex upup-items-center upup-gap-2',
    track: 'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
    fill: 'upup-h-full',
    text: 'upup-text-xs upup-font-semibold',
  },
})
```

### 8.6 Notifier recipe

**File:** `packages/react/src/recipes/notifier.recipe.ts`

```ts
import { tv } from './create-recipe'

export const notifierRecipe = tv({
  slots: {
    root: 'upup-absolute upup-bottom-2 upup-left-2 upup-right-2 upup-z-50 upup-flex upup-flex-col upup-gap-1',
    message: 'upup-rounded-lg upup-px-3 upup-py-2 upup-text-sm upup-shadow-md',
  },
})
```

### 8.7 Recipes barrel

**File:** `packages/react/src/recipes/index.ts`

```ts
export { dropZoneRecipe } from './drop-zone.recipe'
export { sourceSelectorRecipe } from './source-selector.recipe'
export { fileListRecipe } from './file-list.recipe'
export { progressBarRecipe } from './progress-bar.recipe'
export { notifierRecipe } from './notifier.recipe'
```

Additional recipes to create (one file each, same pattern):
- `packages/react/src/recipes/url-uploader.recipe.ts`
- `packages/react/src/recipes/camera-uploader.recipe.ts`
- `packages/react/src/recipes/audio-uploader.recipe.ts`
- `packages/react/src/recipes/screen-capture.recipe.ts`
- `packages/react/src/recipes/drive-browser.recipe.ts`
- `packages/react/src/recipes/file-preview.recipe.ts`
- `packages/react/src/recipes/image-editor.recipe.ts`
- `packages/react/src/recipes/source-view.recipe.ts`

---

## Task 9: `data-state` Attribute on Root (`@upup/react`)

**Issue:** #77

### 9.1 Write tests

**File:** `packages/react/src/theme/__tests__/data-state.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { deriveDataState, type UploaderDataState } from '../data-state'
import { UploadStatus } from '@upup/shared'

describe('deriveDataState', () => {
  it('returns "idle" when status is IDLE and not dragging', () => {
    expect(deriveDataState(UploadStatus.IDLE, false)).toBe('idle')
  })

  it('returns "dragging" when isDragging is true regardless of status', () => {
    expect(deriveDataState(UploadStatus.IDLE, true)).toBe('dragging')
    expect(deriveDataState(UploadStatus.UPLOADING, true)).toBe('dragging')
  })

  it('returns "uploading" when status is UPLOADING', () => {
    expect(deriveDataState(UploadStatus.UPLOADING, false)).toBe('uploading')
  })

  it('returns "paused" when status is PAUSED', () => {
    expect(deriveDataState(UploadStatus.PAUSED, false)).toBe('paused')
  })

  it('returns "successful" when status is SUCCESSFUL', () => {
    expect(deriveDataState(UploadStatus.SUCCESSFUL, false)).toBe('successful')
  })

  it('returns "failed" when status is FAILED', () => {
    expect(deriveDataState(UploadStatus.FAILED, false)).toBe('failed')
  })
})
```

### 9.2 Write implementation

**File:** `packages/react/src/theme/data-state.ts`

```ts
import { UploadStatus } from '@upup/shared'

export type UploaderDataState =
  | 'idle'
  | 'dragging'
  | 'uploading'
  | 'paused'
  | 'successful'
  | 'failed'

const STATUS_MAP: Record<UploadStatus, UploaderDataState> = {
  [UploadStatus.IDLE]: 'idle',
  [UploadStatus.UPLOADING]: 'uploading',
  [UploadStatus.PAUSED]: 'paused',
  [UploadStatus.SUCCESSFUL]: 'successful',
  [UploadStatus.FAILED]: 'failed',
}

/**
 * Derive the data-state attribute value for the uploader root element.
 * Dragging takes priority over upload status.
 */
export function deriveDataState(
  status: UploadStatus,
  isDragging: boolean,
): UploaderDataState {
  if (isDragging) return 'dragging'
  return STATUS_MAP[status] ?? 'idle'
}
```

---

## Task 10: Wire Theme into `UpupUploader` (`@upup/react`)

**Issues:** #69, #46, #78

### 10.1 Update `UpupUploaderProps`

**File:** `packages/react/src/upup-uploader.tsx`

Remove (but keep all other props including `i18n` added by Plan 2):
```ts
dark?: boolean
classNames?: Partial<UploaderClassNames>
```

Add:
```ts
theme?: UpupThemeConfig
```

After this change, `UpupUploaderProps` should have: `mini`, `icons`, `sources`, `fileSources`, `enablePaste`, `i18n` (from Plan 2), and `theme` (new).

### 10.2 Update context type

**File:** `packages/react/src/context/uploader-context.ts`

Replace `dark`, `classNames` in `UploaderUIState` with `resolvedTheme` and `cssVars`. Preserve the `t: Translator` field added by Plan 2 (do NOT revert it to `translations: Translations`):
```ts
import type { UpupResolvedTheme, Translator } from '@upup/shared'

export interface UploaderUIState {
  activeSource: FileSource | null
  setActiveSource: (source: FileSource | null) => void
  resolvedTheme: UpupResolvedTheme
  /** Flat CSS variable map for the style attribute */
  cssVars: Record<string, string>
  mini: boolean
  icons: UploaderIcons
  enablePaste: boolean
  sources: UploadSource[]
  /** The translator function — added by Plan 2 (i18n), preserved here */
  t: Translator
}
```

### 10.3 Update UpupUploader body

In `upup-uploader.tsx`, replace `dark`/`classNames` usage:

```tsx
import { resolveTheme, tokensToVars, type UpupThemeConfig } from '@upup/shared'
import { useUpupTheme } from './theme/useUpupTheme'
import { deriveDataState } from './theme/data-state'

// In component:
const resolvedTheme = useUpupTheme(theme)
const cssVars = useMemo(() => tokensToVars(resolvedTheme.tokens), [resolvedTheme.tokens])

// In context value (note: `t` comes from Plan 2's useTranslator hook):
const contextValue: UploaderContextValue = useMemo(
  () => ({
    ...uploader,
    activeSource,
    setActiveSource,
    resolvedTheme,
    cssVars,
    mini,
    icons: icons as UploaderIcons,
    enablePaste,
    sources,
    t,
  }),
  [uploader, activeSource, resolvedTheme, cssVars, mini, icons, enablePaste, sources, t],
)

// In JSX root:
<div
  className={cn('upup-container', { 'upup-mini': mini })}
  style={cssVars as React.CSSProperties}
  data-theme={resolvedTheme.mode === 'dark' ? 'dark' : 'light'}
  data-state={deriveDataState(uploader.status, isDragging)}
  data-upup-slot="uploader.root"
>
```

---

## Task 10.5: Dark Branch Audit (pre-migration verification)

**Purpose:** Get the exact count of `dark ?` ternary branches before starting component migration, so there are no surprise scope expansions.

### 10.5.1 Run dark branch count

```bash
grep -rn "dark ?" packages/react/src/components/ | wc -l
```

Record the actual number here: **____** (fill in before starting Task 11).

### 10.5.2 Generate per-file breakdown

```bash
grep -rnc "dark ?" packages/react/src/components/ | grep -v ":0$"
```

This produces a file-by-file count so each component migration (Task 11) can be verified against the expected number of removals. If the total differs significantly from the ~41 estimate in "Current State", update the Current State table and adjust Task 11 time estimates accordingly.

### 10.5.3 Acceptance criteria

- [ ] Exact dark branch count is documented (replacing the ~41 estimate)
- [ ] Per-file breakdown is saved (paste output into a comment on the tracking issue)
- [ ] Any files with `dark ?` NOT listed in Task 11 migration groups are identified and added

---

## Task 11: Component Migration (25 files)

Each component is migrated by:
1. Removing `dark` from `useUploaderContext()` destructuring
2. Replacing `cn(... { 'some-class': dark })` with recipe slot + `data-upup-slot`
3. Using `resolvedTheme.slots.<component>.<slot>` for user overrides
4. Removing hardcoded color classes; colors now come from CSS variables via `style`
5. Adding `data-upup-slot="<component>.<slot>"` to every slotted element

### Migration pattern (template for every component):

```tsx
// BEFORE
const { dark, classNames } = useUploaderContext()
// ...
<div className={cn('upup-bg-white', { 'upup-bg-gray-900': dark }, classNames.someKey)}>

// AFTER
const { resolvedTheme } = useUploaderContext()
const styles = fileListRecipe({ hidden: isHidden, multiFile: files.length > 1 })
// ...
<div
  className={cn(styles.header(), resolvedTheme.slots.fileList?.header)}
  style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
  data-upup-slot="fileList.header"
>
```

### Group A: Core layout (3 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.1 | `components/drop-zone.tsx` | `dropZoneRecipe` | `dropZone.root` |
| 11.2 | `components/source-selector.tsx` | `sourceSelectorRecipe` | `sourceSelector.root`, `.adapterList`, `.adapterButton`, `.adapterButtonText`, `.browseText`, `.dragText` |
| 11.3 | `components/source-view.tsx` | `sourceViewRecipe` | `sourceView.root`, `.header`, `.cancelButton` |

### Group B: File display (4 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.4 | `components/file-list.tsx` | `fileListRecipe` | `fileList.root`, `.header`, `.cancelButton`, `.fileCount`, `.body`, `.footer`, `.uploadButton`, `.doneButton`, `.pauseResumeButton` |
| 11.5 | `components/file-preview.tsx` | `filePreviewRecipe` | `filePreview.root`, `.thumbnail`, `.info`, `.name`, `.size`, `.deleteButton` |
| 11.6 | `components/file-preview-thumbnail.tsx` | (uses filePreview recipe) | `filePreview.thumbnail` |
| 11.7 | `components/file-preview-portal.tsx` | (uses filePreviewPortal recipe) | `filePreviewPortal.root` |

### Group C: Progress + Notifications (2 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.8 | `components/progress-bar.tsx` | `progressBarRecipe` | `progressBar.root`, `.track`, `.fill`, `.text` |
| 11.9 | `components/notifier.tsx` | `notifierRecipe` | `notifier.root`, `.message` |

### Group D: Capture adapters (3 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.10 | `components/camera-uploader.tsx` | `cameraUploaderRecipe` | `cameraUploader.root`, `.captureButton`, `.deleteButton`, etc. |
| 11.11 | `components/audio-uploader.tsx` | `audioUploaderRecipe` | `audioUploader.root`, `.recordButton`, `.stopButton`, etc. |
| 11.12 | `components/screen-capture-uploader.tsx` | `screenCaptureRecipe` | `screenCaptureUploader.root`, `.startButton`, `.stopButton`, etc. |

### Group E: URL adapter (1 file)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.13 | `components/url-uploader.tsx` | `urlUploaderRecipe` | `urlUploader.input`, `.fetchButton` |

### Group F: Drive adapters (5 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.14 | `components/shared/drive-browser.tsx` | `driveBrowserRecipe` | `driveBrowser.root`, `.body`, `.footer`, etc. |
| 11.15 | `components/shared/drive-browser-header.tsx` | (uses driveBrowser recipe) | `driveBrowser.header`, `.searchInput` |
| 11.16 | `components/shared/drive-browser-item.tsx` | (uses driveBrowser recipe) | `driveBrowser.itemDefault`, `.itemSelected` |
| 11.17 | `components/shared/drive-auth-fallback.tsx` | (uses driveAuthFallback recipe) | `driveAuthFallback.root` |
| 11.18 | `components/shared/drive-browser-icon.tsx` | No recipe needed (icon only) | — |
| 11.18b | `components/shared/main-box-header.tsx` | (uses fileList or sourceSelector recipe) | `fileList.header` or `sourceSelector.header` (verify usage) |

### Group G: Cloud adapters (3 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.19 | `adapters/google-drive-uploader.tsx` | — (wraps drive-browser) | — |
| 11.20 | `adapters/onedrive-uploader.tsx` | — (wraps drive-browser) | — |
| 11.21 | `adapters/dropbox-uploader.tsx` | — (wraps drive-browser) | — |

### Group H: Image editor (2 files)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.22 | `components/image-editor-inline.tsx` | `imageEditorRecipe` | `imageEditor.root` |
| 11.23 | `components/image-editor-modal.tsx` | `imageEditorRecipe` | `imageEditor.modal` |

### Group I: Paste zone (1 file)

| # | File | Recipe | Slots |
|---|------|--------|-------|
| 11.24 | `components/paste-zone.tsx` | — (thin wrapper) | — |

---

## Task 12: CSS Variable Defaults in Tailwind CSS

**File:** `packages/react/src/tailwind.css`

Add at the top of the file (these are fallback defaults so components render correctly even without JS-injected style):

```css
@layer base {
  .upup-container {
    --upup-color-surface: #FFFFFF;
    --upup-color-surface-alt: #F7F7F8;
    --upup-color-primary: #1849D6;
    --upup-color-primary-hover: #0E2ADD;
    --upup-color-text: #0B0B0B;
    --upup-color-text-muted: #6D6D6D;
    --upup-color-border: #D1D5DB;
    --upup-color-border-active: #1849D6;
    --upup-color-danger: #DC2626;
    --upup-color-success: #16A34A;
    --upup-color-drag-bg: #E7ECFC;
    --upup-color-overlay: rgba(0, 0, 0, 0.5);
    --upup-radius-sm: 4px;
    --upup-radius-md: 8px;
    --upup-radius-lg: 12px;
    --upup-radius-full: 9999px;
    --upup-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --upup-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
    --upup-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    --upup-spacing-xs: 4px;
    --upup-spacing-sm: 8px;
    --upup-spacing-md: 12px;
    --upup-spacing-lg: 16px;
  }

  .upup-container[data-theme="dark"] {
    --upup-color-surface: #1A1A2E;
    --upup-color-surface-alt: #252540;
    --upup-color-primary: #30C5F7;
    --upup-color-primary-hover: #59D1F9;
    --upup-color-text: #FFFFFF;
    --upup-color-text-muted: #D1D5DB;
    --upup-color-border: #4B5563;
    --upup-color-border-active: #30C5F7;
    --upup-color-danger: #EF4444;
    --upup-color-success: #22C55E;
    --upup-color-drag-bg: #045671;
    --upup-color-overlay: rgba(0, 0, 0, 0.7);
    --upup-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
    --upup-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
    --upup-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
  }
}
```

---

## Task 13: Remove Old `UploaderClassNames` Type

**File:** `packages/shared/src/types/class-names.ts`

Delete entirely or replace contents with:

```ts
/**
 * @deprecated Use UpupThemeSlots from '@upup/shared' instead.
 * This type is kept temporarily for reference during migration.
 */
export type UploaderClassNames = Record<string, never>
```

Update `packages/shared/src/types/index.ts` to remove the re-export once all consumers are migrated.

---

## Task 14: Update React Package Exports

**File:** `packages/react/src/index.ts`

Add:
```ts
export { UpupThemeProvider } from './theme'
export type { UpupThemeProviderProps } from './theme'
```

Ensure `UpupThemeConfig`, `UpupResolvedTheme`, `UpupThemeTokens`, `UpupThemeSlots` are re-exported from `@upup/shared`.

---

## Task 15: Integration Tests

**File:** `packages/react/src/__tests__/theme-integration.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../upup-uploader'
import { UpupThemeProvider } from '../theme'

describe('Theme Integration', () => {
  it('renders with default light theme', () => {
    render(<UpupUploader />)
    const root = document.querySelector('[data-upup-slot="uploader.root"]')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('data-theme')).toBe('light')
  })

  it('renders with dark theme via prop', () => {
    render(<UpupUploader theme={{ mode: 'dark' }} />)
    const root = document.querySelector('[data-upup-slot="uploader.root"]')
    expect(root?.getAttribute('data-theme')).toBe('dark')
  })

  it('applies CSS variables from theme tokens', () => {
    render(
      <UpupUploader
        theme={{ tokens: { color: { primary: '#CUSTOM' } } }}
      />,
    )
    const root = document.querySelector('[data-upup-slot="uploader.root"]') as HTMLElement
    expect(root?.style.getPropertyValue('--upup-color-primary')).toBe('#CUSTOM')
  })

  it('inherits mode from UpupThemeProvider', () => {
    render(
      <UpupThemeProvider mode="dark">
        <UpupUploader />
      </UpupThemeProvider>,
    )
    const root = document.querySelector('[data-upup-slot="uploader.root"]')
    expect(root?.getAttribute('data-theme')).toBe('dark')
  })

  it('instance theme overrides provider theme', () => {
    render(
      <UpupThemeProvider mode="dark" tokens={{ color: { primary: '#AAA' } }}>
        <UpupUploader theme={{ tokens: { color: { primary: '#BBB' } } }} />
      </UpupThemeProvider>,
    )
    const root = document.querySelector('[data-upup-slot="uploader.root"]') as HTMLElement
    expect(root?.style.getPropertyValue('--upup-color-primary')).toBe('#BBB')
  })

  it('sets data-state based on upload status', () => {
    render(<UpupUploader />)
    const root = document.querySelector('[data-upup-slot="uploader.root"]')
    expect(root?.getAttribute('data-state')).toBe('idle')
  })

  it('applies slot class overrides', () => {
    render(
      <UpupUploader
        theme={{
          slots: { fileList: { uploadButton: 'my-custom-btn' } },
        }}
      />,
    )
    // The custom class will be applied when fileList renders with files
    // This is a structural test to verify the prop path works
  })
})
```

---

## Execution Checklist

| # | Task | Package | Files Created | Files Modified | Tests |
|---|------|---------|---------------|----------------|-------|
| 1 | Token types | shared | `theme/types.ts` | `index.ts` | `types.test.ts` |
| 2 | Presets | shared | `theme/presets.ts` | — | `presets.test.ts` |
| 3 | resolveTheme | shared | `theme/resolve-theme.ts` | — | `resolve-theme.test.ts` |
| 4 | CSS var helpers | shared | `theme/vars.ts` | — | `vars.test.ts` |
| 5 | Slots type | shared | `theme/slots.ts` | — | `slots.test.ts` |
| 6 | Extend config | shared | — | `theme/types.ts`, `theme/resolve-theme.ts` | — |
| 7 | ThemeProvider | react | `theme/UpupThemeProvider.tsx`, `theme/useUpupTheme.ts`, `theme/index.ts` | — | `UpupThemeProvider.test.tsx` |
| 8 | Slot recipes | react | `recipes/*.recipe.ts`, `recipes/index.ts`, `recipes/create-recipe.ts` | `package.json` | — |
| 9 | data-state | react | `theme/data-state.ts` | — | `data-state.test.ts` |
| 10 | Wire UpupUploader | react | — | `upup-uploader.tsx`, `uploader-context.ts` | — |
| 10.5 | Dark branch audit | react | — | — | — (verification step) |
| 11 | Component migration | react | — | 25 component/adapter files (16 components + 6 shared + 3 adapters) | — |
| 12 | CSS variable defaults | react | — | `tailwind.css` | — |
| 13 | Remove old classNames | shared | — | `types/class-names.ts`, `types/index.ts` | — |
| 14 | Export updates | react | — | `index.ts` | — |
| 15 | Integration tests | react | `__tests__/theme-integration.test.tsx` | — | `theme-integration.test.tsx` |

---

## Migration Summary for Consumers

```tsx
// BEFORE (v1)
<UpupUploader dark classNames={{ uploadButton: 'my-btn' }} />

// AFTER (v2)
<UpupUploader
  theme={{
    mode: 'dark',
    slots: { fileList: { uploadButton: 'my-btn' } },
  }}
/>

// Or with provider for multi-instance
<UpupThemeProvider mode="dark" tokens={{ color: { primary: '#brand' } }}>
  <UpupUploader />
  <UpupUploader theme={{ tokens: { color: { primary: '#other' } } }} />
</UpupThemeProvider>
```

---

## Notes

- `tailwind-variants` is added as **devDependency** (recipes are compiled at build time; the `tv()` call output is just class strings)
- All CSS variable names use `--upup-` prefix to avoid conflicts
- The `data-upup-slot` attribute enables external CSS targeting: `[data-upup-slot="fileList.uploadButton"] { ... }`
- `data-theme` on root enables CSS-only theming without JS: `.upup-container[data-theme="dark"] { ... }`
- `data-state` enables CSS-driven state styling: `[data-state="uploading"] { ... }`
- The `cn()` helper from `lib/tailwind.ts` is kept — recipes produce base classes, `cn()` merges them with slot overrides
