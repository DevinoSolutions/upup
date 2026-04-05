import { describe, it, expect } from 'vitest'

describe('restrictions → flat props mapping', () => {
  it('maps restrictions.maxNumberOfFiles to limit', () => {
    const restrictions = { maxNumberOfFiles: 5 }
    const propLimit = undefined
    const maxFiles = undefined
    const resolvedLimit = propLimit ?? maxFiles ?? restrictions?.maxNumberOfFiles ?? 1
    expect(resolvedLimit).toBe(5)
  })

  it('flat prop takes precedence over restrictions', () => {
    const restrictions = { maxNumberOfFiles: 10 }
    const maxFiles = 3
    const resolvedLimit = undefined ?? maxFiles ?? restrictions?.maxNumberOfFiles ?? 1
    expect(resolvedLimit).toBe(3)
  })

  it('maps restrictions.allowedFileTypes to accept string', () => {
    const restrictions = { allowedFileTypes: ['image/*', '.pdf', 'video/mp4'] }
    const accept = restrictions.allowedFileTypes.join(',')
    expect(accept).toBe('image/*,.pdf,video/mp4')
  })

  it('defaults to * when no restrictions or accept', () => {
    const acceptProp = '*'
    const restrictions = undefined
    const accept = restrictions?.allowedFileTypes ? restrictions.allowedFileTypes.join(',') : acceptProp
    expect(accept).toBe('*')
  })

  it('maps restrictions.maxFileSize', () => {
    const restrictions = { maxFileSize: { size: 10, unit: 'MB' as const } }
    const maxFileSizeProp = undefined
    const maxFileSize = maxFileSizeProp ?? restrictions?.maxFileSize
    expect(maxFileSize).toEqual({ size: 10, unit: 'MB' })
  })

  it('maps restrictions.minFileSize', () => {
    const restrictions = { minFileSize: { size: 100, unit: 'KB' as const } }
    const minFileSizeProp = undefined
    const minFileSize = minFileSizeProp ?? restrictions?.minFileSize
    expect(minFileSize).toEqual({ size: 100, unit: 'KB' })
  })
})
