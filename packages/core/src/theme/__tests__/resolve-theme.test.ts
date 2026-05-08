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

  it('returns empty slots when none provided', () => {
    const result = resolveTheme()
    expect(result.slots).toEqual({})
  })

  it('merges provider and instance slots', () => {
    const result = resolveTheme(
      { slots: { fileList: { uploadButton: 'instance-btn' } } },
      undefined,
      { fileList: { header: 'provider-header' } },
    )
    expect(result.slots.fileList?.uploadButton).toBe('instance-btn')
    expect(result.slots.fileList?.header).toBe('provider-header')
  })
})
