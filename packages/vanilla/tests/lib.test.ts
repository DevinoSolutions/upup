import { describe, it, expect } from 'vitest'
import { resolveTarget } from '../src/lib/dom'
import { devinoDark, devinoLight, logoDark, logoLight } from '../src/assets/logos'

describe('lib/dom resolveTarget', () => {
  it('throws a descriptive error when target selector is missing', () => {
    expect(() => resolveTarget('#does-not-exist')).toThrow(/target not found/)
  })
  it('returns the element when found', () => {
    const div = document.createElement('div')
    div.id = 'mount-here'
    document.body.appendChild(div)
    expect(resolveTarget('#mount-here')).toBe(div)
    expect(resolveTarget(div)).toBe(div)
    div.remove()
  })
})

describe('assets/logos', () => {
  it('exports four non-empty data URIs', () => {
    for (const uri of [devinoDark, devinoLight, logoDark, logoLight]) {
      expect(uri.startsWith('data:image/')).toBe(true)
      expect(uri.length).toBeGreaterThan(100)
    }
  })
})
