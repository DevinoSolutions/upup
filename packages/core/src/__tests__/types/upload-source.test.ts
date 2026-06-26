import { describe, it, expect } from 'vitest'
import { FileSource } from '../../types/file-source'
import type { UploadSource } from '../../types/uploader-options'

// Behavior-preserving refactor guard: the accept-set of UploadSource must be
// exactly {raw FileSource string values} ∪ {FileSource enum members}, closed.
describe('UploadSource accept-set', () => {
  it('accepts raw string source values', () => {
    const a: UploadSource = 'local'
    const b: UploadSource = 'googleDrive'
    const c: UploadSource = 'box'
    expect([a, b, c]).toEqual(['local', 'googleDrive', 'box'])
  })

  it('accepts FileSource enum members', () => {
    const d: UploadSource = FileSource.BOX
    const e: UploadSource = FileSource.ONE_DRIVE
    expect([d, e]).toEqual(['box', 'oneDrive'])
  })

  it('rejects unknown source values', () => {
    // @ts-expect-error 'nope' is not a valid UploadSource
    const f: UploadSource = 'nope'
    expect(f).toBe('nope')
  })
})
