// src/parameters.test.ts
import { describe, it, expect } from 'vitest'
import { sharedParameters } from './parameters'

describe('sharedParameters', () => {
  it('defines playground light/dark backgrounds', () => {
    const values = sharedParameters.backgrounds.values.map((v) => v.name)
    expect(values).toContain('light')
    expect(values).toContain('dark')
  })
  it('enables alphabetical-ish category grouping for controls', () => {
    expect(sharedParameters.controls.sort).toBe('requiredFirst')
  })
})
