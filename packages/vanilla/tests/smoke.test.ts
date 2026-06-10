import { describe, it, expect } from 'vitest'
import { VANILLA_PACKAGE } from '../src/index'

describe('@upup/vanilla scaffold', () => {
  it('exposes the package marker', () => {
    expect(VANILLA_PACKAGE).toBe('@upup/vanilla')
  })
})
