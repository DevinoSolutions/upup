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
