import { describe, it, expect } from 'vitest'

// v2: dark is derived purely from theme.mode; the legacy `dark` boolean prop
// was removed in favour of a single source of truth.
function resolveThemeMode(theme: { mode?: 'light' | 'dark' | 'system' } | undefined): boolean {
  return theme?.mode === 'dark'
}

describe('theme → dark mapping', () => {
  it('theme.mode=dark sets dark=true', () => {
    expect(resolveThemeMode({ mode: 'dark' })).toBe(true)
  })

  it('theme.mode=light sets dark=false', () => {
    expect(resolveThemeMode({ mode: 'light' })).toBe(false)
  })

  it('theme.mode=system sets dark=false (system resolution happens outside this helper)', () => {
    expect(resolveThemeMode({ mode: 'system' })).toBe(false)
  })

  it('no theme → dark=false', () => {
    expect(resolveThemeMode(undefined)).toBe(false)
    expect(resolveThemeMode({})).toBe(false)
  })
})
