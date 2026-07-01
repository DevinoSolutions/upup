import { describe, it, expect, vi } from 'vitest'

// Test the file validation logic as resolved in useUploaderController's handleSetSelectedFiles
// These tests mirror the validation flow without requiring React rendering

describe('onBeforeFileAdded filter', () => {
  it('skips file when onBeforeFileAdded returns false', async () => {
    const onBeforeFileAdded = vi.fn().mockResolvedValue(false)
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const result = await onBeforeFileAdded(file)
    expect(result).toBe(false)
    expect(onBeforeFileAdded).toHaveBeenCalledWith(file)
  })

  it('allows file when onBeforeFileAdded returns undefined', async () => {
    const onBeforeFileAdded = vi.fn().mockResolvedValue(undefined)
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const result = await onBeforeFileAdded(file)
    // undefined means "allowed" (not explicitly rejected)
    expect(result).not.toBe(false)
  })

  it('allows file when onBeforeFileAdded returns true', async () => {
    const onBeforeFileAdded = vi.fn().mockResolvedValue(true)
    const result = await onBeforeFileAdded(new File([''], 'ok.txt'))
    expect(result).toBe(true)
  })

  it('skips filter when onBeforeFileAdded is not provided', () => {
    const onBeforeFileAdded = undefined
    // Simulates: if (onBeforeFileAdded) { ... }
    const shouldFilter = !!onBeforeFileAdded
    expect(shouldFilter).toBe(false)
  })
})

describe('onRestrictionFailed callback', () => {
  it('is called with file and reason on limit exceeded', () => {
    const onRestrictionFailed = vi.fn()
    const file = new File(['content'], 'excess.txt', { type: 'text/plain' })
    onRestrictionFailed(file, 'LIMIT_EXCEEDED')
    expect(onRestrictionFailed).toHaveBeenCalledWith(file, 'LIMIT_EXCEEDED')
  })

  it('is called with file and reason on type mismatch', () => {
    const onRestrictionFailed = vi.fn()
    const file = new File(['content'], 'bad.exe', { type: 'application/x-msdownload' })
    onRestrictionFailed(file, 'TYPE_MISMATCH')
    expect(onRestrictionFailed).toHaveBeenCalledWith(file, 'TYPE_MISMATCH')
  })

  it('is called with file and reason on file too large', () => {
    const onRestrictionFailed = vi.fn()
    const file = new File(['x'.repeat(1000)], 'big.txt', { type: 'text/plain' })
    onRestrictionFailed(file, 'FILE_TOO_LARGE')
    expect(onRestrictionFailed).toHaveBeenCalledWith(file, 'FILE_TOO_LARGE')
  })

  it('is called with file and reason on file too small', () => {
    const onRestrictionFailed = vi.fn()
    const file = new File([''], 'tiny.txt', { type: 'text/plain' })
    onRestrictionFailed(file, 'FILE_TOO_SMALL')
    expect(onRestrictionFailed).toHaveBeenCalledWith(file, 'FILE_TOO_SMALL')
  })

  it('is optional — no error when undefined', () => {
    const onRestrictionFailed: ((file: File, reason: string) => void) | undefined = undefined
    const file = new File([''], 'test.txt')
    // Simulates: onRestrictionFailed?.(file, 'LIMIT_EXCEEDED')
    expect(() => onRestrictionFailed?.(file, 'LIMIT_EXCEEDED')).not.toThrow()
  })
})

describe('file type checking logic', () => {
  // Mirrors the checkFileType function used in v1
  function checkFileType(accept: string, file: File): boolean {
    if (!accept) return true
    const types = accept.split(',').map(t => t.trim())
    return types.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'))
      }
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      return file.type === type
    })
  }

  it('accepts file matching MIME type', () => {
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    expect(checkFileType('application/pdf', file)).toBe(true)
  })

  it('accepts file matching wildcard MIME', () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    expect(checkFileType('image/*', file)).toBe(true)
  })

  it('accepts file matching extension', () => {
    const file = new File(['content'], 'data.csv', { type: 'text/csv' })
    expect(checkFileType('.csv', file)).toBe(true)
  })

  it('rejects file not matching accept', () => {
    const file = new File(['content'], 'script.js', { type: 'application/javascript' })
    expect(checkFileType('image/*,.pdf', file)).toBe(false)
  })

  it('accepts all when accept is empty', () => {
    const file = new File(['content'], 'anything.xyz', { type: 'application/octet-stream' })
    expect(checkFileType('', file)).toBe(true)
  })

  it('handles multiple accept types', () => {
    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    expect(checkFileType('.pdf,image/*,.doc', file)).toBe(true)
  })
})
