import { describe, it, expect } from 'vitest'
import {
  mergeConstructOptions,
  mergeUpdateOptions,
} from '../../src/options/normalize-core-options'
import { UpupCore } from '../../src/core'
import type { CoreOptions } from '../../src/core'

describe('mergeConstructOptions (value-guard, flat wins)', () => {
  it('fills flat maxFileSize from restrictions when flat is absent', () => {
    const options: CoreOptions = { restrictions: { maxFileSize: { size: 5, unit: 'MB' } } }
    const target = { ...options }
    mergeConstructOptions(target, options)
    expect(target.maxFileSize).toEqual({ size: 5, unit: 'MB' })
  })

  it('flat value wins over restrictions (value guard)', () => {
    const options: CoreOptions = {
      maxFileSize: { size: 1, unit: 'MB' },
      restrictions: { maxFileSize: { size: 5, unit: 'MB' } },
    }
    const target = { ...options }
    mergeConstructOptions(target, options)
    expect(target.maxFileSize).toEqual({ size: 1, unit: 'MB' })
  })

  it('maps maxNumberOfFiles→limit, minNumberOfFiles→minFiles, allowedFileTypes→joined string', () => {
    const options: CoreOptions = {
      restrictions: { maxNumberOfFiles: 3, minNumberOfFiles: 1, allowedFileTypes: ['image/png', 'image/jpeg'] },
    }
    const target = { ...options }
    mergeConstructOptions(target, options)
    expect(target.limit).toBe(3)
    expect(target.minFiles).toBe(1)
    expect(target.allowedFileTypes).toBe('image/png,image/jpeg')
  })

  it('leaves cloudDrives untouched (stored as-is, no flat mirroring)', () => {
    const options: CoreOptions = {
      cloudDrives: { googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' } },
    }
    const target = { ...options }
    mergeConstructOptions(target, options)
    expect(target.cloudDrives).toBe(options.cloudDrives)
  })
})

describe('mergeUpdateOptions (key-guard)', () => {
  it('fills flat key when key is ABSENT from the partial', () => {
    const partial: Partial<CoreOptions> = { restrictions: { maxFileSize: { size: 9, unit: 'MB' } } }
    const target: CoreOptions = {}
    Object.assign(target, partial)
    mergeUpdateOptions(target, partial)
    expect(target.maxFileSize).toEqual({ size: 9, unit: 'MB' })
  })

  it('does NOT override a flat key explicitly present in the same partial', () => {
    const partial: Partial<CoreOptions> = {
      maxFileSize: { size: 2, unit: 'MB' },
      restrictions: { maxFileSize: { size: 9, unit: 'MB' } },
    }
    const target: CoreOptions = {}
    Object.assign(target, partial)
    mergeUpdateOptions(target, partial)
    expect(target.maxFileSize).toEqual({ size: 2, unit: 'MB' })
  })

})

describe('characterization via UpupCore (behavior preserved through public API)', () => {
  it('constructor merges restrictions into flat options', () => {
    const core = new UpupCore({ restrictions: { maxNumberOfFiles: 4, allowedFileTypes: ['image/png'] } })
    expect(core.options.limit).toBe(4)
    expect(core.options.allowedFileTypes).toBe('image/png')
    core.destroy()
  })

  it('updateOptions replaces cloudDrives wholesale (plain assign)', () => {
    const core = new UpupCore({
      cloudDrives: { googleDrive: { clientId: 'old', apiKey: 'k', appId: 'a' } },
    })
    core.updateOptions({ cloudDrives: { googleDrive: { clientId: 'new', apiKey: 'k', appId: 'a' } } })
    expect(core.options.cloudDrives?.googleDrive?.clientId).toBe('new')
    core.destroy()
  })
})
