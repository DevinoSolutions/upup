import { describe, it, expect } from 'vitest'
import {
  validateFileRestrictions,
  fileSizeInBytes,
  matchesAccept,
} from '../src/validate-file-restrictions'
import { UpupErrorCode } from '../src/errors'

function file(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('validateFileRestrictions', () => {
  it('returns [] when no restrictions configured', () => {
    expect(validateFileRestrictions(file('a.txt', 'text/plain', 10), {})).toEqual([])
  })

  it('flags TYPE_MISMATCH with exact message', () => {
    expect(
      validateFileRestrictions(file('a.png', 'image/png', 10), { allowedFileTypes: 'image/jpeg' }),
    ).toEqual([{ code: UpupErrorCode.TYPE_MISMATCH, message: 'File type "image/png" is not accepted' }])
  })

  it('flags FILE_TOO_LARGE with exact message', () => {
    expect(
      validateFileRestrictions(file('a.txt', 'text/plain', 2048), { maxFileSize: { size: 1, unit: 'KB' } }),
    ).toEqual([{ code: UpupErrorCode.FILE_TOO_LARGE, message: 'File "a.txt" exceeds maximum size' }])
  })

  it('flags FILE_TOO_SMALL with exact message', () => {
    expect(
      validateFileRestrictions(file('a.txt', 'text/plain', 10), { minFileSize: { size: 1, unit: 'KB' } }),
    ).toEqual([{ code: UpupErrorCode.FILE_TOO_SMALL, message: 'File "a.txt" is below minimum size' }])
  })

  it('collects multiple violations in order [type, max]', () => {
    const errors = validateFileRestrictions(file('a.png', 'image/png', 2048), {
      allowedFileTypes: 'image/jpeg',
      maxFileSize: { size: 1, unit: 'KB' },
    })
    expect(errors.map(e => e.code)).toEqual([UpupErrorCode.TYPE_MISMATCH, UpupErrorCode.FILE_TOO_LARGE])
  })

  it('orders type before min', () => {
    const errors = validateFileRestrictions(file('a.png', 'image/png', 5), {
      allowedFileTypes: 'image/jpeg',
      minFileSize: { size: 1, unit: 'KB' },
    })
    expect(errors.map(e => e.code)).toEqual([UpupErrorCode.TYPE_MISMATCH, UpupErrorCode.FILE_TOO_SMALL])
  })
})

describe('relocated utils', () => {
  it('fileSizeInBytes converts KB', () => {
    expect(fileSizeInBytes({ size: 1, unit: 'KB' })).toBe(1024)
  })
  it('matchesAccept honors wildcard', () => {
    expect(matchesAccept(file('a.png', 'image/png', 1), '*')).toBe(true)
  })
})
