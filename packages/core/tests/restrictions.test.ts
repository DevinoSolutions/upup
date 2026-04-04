import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('CoreOptions.restrictions', () => {
  it('should accept a restrictions nested object', () => {
    const core = new UpupCore({
      restrictions: {
        maxFileSize: { size: 10, unit: 'MB' },
        minFileSize: { size: 1, unit: 'KB' },
        maxTotalFileSize: { size: 100, unit: 'MB' },
        maxNumberOfFiles: 5,
        minNumberOfFiles: 1,
        allowedFileTypes: ['image/*', '.pdf'],
      },
    })
    expect(core.files.size).toBe(0)
    core.destroy()
  })

  it('should merge restrictions with flat options (flat takes precedence)', () => {
    const core = new UpupCore({
      restrictions: {
        maxNumberOfFiles: 10,
      },
      limit: 5, // flat option takes precedence
    })
    // Internally limit should be 5, not 10
    expect(core.options.limit).toBe(5)
    core.destroy()
  })

  it('should use restrictions values when flat options are not set', async () => {
    const core = new UpupCore({
      restrictions: {
        maxNumberOfFiles: 2,
        allowedFileTypes: ['text/plain'],
      },
    })

    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    await core.addFiles([f1, f2])
    expect(core.files.size).toBe(2)

    const f3 = new File(['c'], 'c.txt', { type: 'text/plain' })
    await expect(core.addFiles([f3])).rejects.toThrow()

    core.destroy()
  })
})
