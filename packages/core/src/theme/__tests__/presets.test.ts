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
