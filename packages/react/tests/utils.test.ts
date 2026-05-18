import { describe, it, expect } from 'vitest'
import { cn, b64EncodeUnicode } from '@upup/core'

describe('cn() — tailwind class merge utility', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('handles undefined/null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('merges conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('merges conflicting color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('preserves non-conflicting classes', () => {
    const result = cn('p-2', 'mt-4', 'text-sm')
    expect(result).toContain('p-2')
    expect(result).toContain('mt-4')
    expect(result).toContain('text-sm')
  })

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('b64EncodeUnicode', () => {
  it('encodes ASCII string', () => {
    const encoded = b64EncodeUnicode('hello')
    expect(atob(encoded)).toBe('hello')
  })

  it('encodes string with special characters', () => {
    const encoded = b64EncodeUnicode('hello world!')
    expect(atob(encoded)).toBe('hello world!')
  })

  it('encodes unicode characters', () => {
    const encoded = b64EncodeUnicode('café')
    expect(encoded).toBeTruthy()
    // Should be decodable
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
  })

  it('encodes file paths', () => {
    const encoded = b64EncodeUnicode('photos/vacation/beach.jpg')
    expect(atob(encoded)).toBe('photos/vacation/beach.jpg')
  })

  it('encodes empty string', () => {
    const encoded = b64EncodeUnicode('')
    expect(atob(encoded)).toBe('')
  })

  it('produces different outputs for different inputs', () => {
    const a = b64EncodeUnicode('file-a.txt')
    const b = b64EncodeUnicode('file-b.txt')
    expect(a).not.toBe(b)
  })

  it('handles filenames with spaces', () => {
    const encoded = b64EncodeUnicode('my document.pdf')
    expect(atob(encoded)).toBe('my document.pdf')
  })
})
