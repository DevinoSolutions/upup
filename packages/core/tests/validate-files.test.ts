import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('UpupCore.validateFiles', () => {
  it('should return valid results for acceptable files', async () => {
    const core = new UpupCore({
      accept: 'text/plain',
      maxFileSize: { size: 1, unit: 'MB' },
    })

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const results = await core.validateFiles([f1])

    expect(results).toHaveLength(1)
    expect(results[0].valid).toBe(true)
    expect(results[0].file).toBe(f1)
    expect(results[0].errors).toEqual([])

    core.destroy()
  })

  it('should return invalid result for wrong file type', async () => {
    const core = new UpupCore({
      accept: 'text/plain',
    })

    const f1 = new File(['hello'], 'test.png', { type: 'image/png' })
    const results = await core.validateFiles([f1])

    expect(results).toHaveLength(1)
    expect(results[0].valid).toBe(false)
    expect(results[0].errors.length).toBeGreaterThan(0)
    expect(results[0].errors[0].code).toBe('TYPE_MISMATCH')

    core.destroy()
  })

  it('should return invalid result for file exceeding size limit', async () => {
    const core = new UpupCore({
      maxFileSize: { size: 1, unit: 'B' },
    })

    const f1 = new File(['hello world'], 'test.txt', { type: 'text/plain' })
    const results = await core.validateFiles([f1])

    expect(results).toHaveLength(1)
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0].code).toBe('FILE_TOO_LARGE')

    core.destroy()
  })

  it('should validate multiple files independently', async () => {
    const core = new UpupCore({
      accept: 'text/plain',
      maxFileSize: { size: 5, unit: 'B' },
    })

    const f1 = new File(['hi'], 'good.txt', { type: 'text/plain' })
    const f2 = new File(['hello world this is too big'], 'big.txt', { type: 'text/plain' })
    const f3 = new File(['x'], 'wrong.png', { type: 'image/png' })

    const results = await core.validateFiles([f1, f2, f3])

    expect(results).toHaveLength(3)
    expect(results[0].valid).toBe(true)
    expect(results[1].valid).toBe(false)
    expect(results[2].valid).toBe(false)

    core.destroy()
  })

  it('should not modify the internal file list', async () => {
    const core = new UpupCore({})
    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })

    await core.validateFiles([f1])
    expect(core.files.size).toBe(0) // validateFiles is read-only

    core.destroy()
  })
})
