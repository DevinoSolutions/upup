// src/theme.test.ts
import { describe, it, expect } from 'vitest'
import { upupManagerTheme } from './theme'

describe('upupManagerTheme', () => {
  it('uses the Upup brand identity and playground primary colors', () => {
    expect(upupManagerTheme.brandTitle).toBe('Upup')
    expect(upupManagerTheme.colorPrimary).toBe('#1849d6')
    expect(upupManagerTheme.colorSecondary).toBe('#37c4f5')
    expect(upupManagerTheme.fontBase).toContain('Geist')
  })
})
