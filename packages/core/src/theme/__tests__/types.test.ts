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
