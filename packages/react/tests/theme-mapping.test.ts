import { describe, it, expect } from 'vitest'

// Test the theme.mode → dark boolean mapping
function resolveThemeMode(theme: { mode?: 'light' | 'dark' } | undefined, darkProp: boolean): boolean {
  return theme?.mode ? theme.mode === 'dark' : darkProp
}

describe('theme → dark mapping', () => {
  it('theme.mode=dark sets dark=true', () => {
    expect(resolveThemeMode({ mode: 'dark' }, false)).toBe(true)
  })

  it('theme.mode=light sets dark=false', () => {
    expect(resolveThemeMode({ mode: 'light' }, true)).toBe(false)
  })

  it('theme takes precedence over dark prop', () => {
    expect(resolveThemeMode({ mode: 'light' }, true)).toBe(false)
    expect(resolveThemeMode({ mode: 'dark' }, false)).toBe(true)
  })

  it('falls back to dark prop when no theme', () => {
    expect(resolveThemeMode(undefined, true)).toBe(true)
    expect(resolveThemeMode(undefined, false)).toBe(false)
  })

  it('falls back to dark prop when theme has no mode', () => {
    expect(resolveThemeMode({}, true)).toBe(true)
    expect(resolveThemeMode({}, false)).toBe(false)
  })
})
