import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('addFiles with overrides', () => {
  it('should store per-batch overrides for later use in upload', async () => {
    const core = new UpupCore({})

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([f1], { checksumVerification: true, maxRetries: 5 })

    // Overrides should be stored internally
    const overrides = (core as any).fileOverrides as Map<string, any>
    expect(overrides).toBeDefined()
    const fileId = [...core.files.keys()][0]
    expect(overrides.get(fileId)).toEqual({ checksumVerification: true, maxRetries: 5 })

    core.destroy()
  })

  it('should pass overrides metadata through to upload', async () => {
    const core = new UpupCore({})

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([f1], { metadata: { customKey: 'customValue' } })

    const overrides = (core as any).fileOverrides as Map<string, any>
    const fileId = [...core.files.keys()][0]
    expect(overrides.get(fileId)?.metadata).toEqual({ customKey: 'customValue' })

    core.destroy()
  })

  it('should clean up overrides when file is removed', async () => {
    const core = new UpupCore({})

    const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([f1], { maxRetries: 3 })

    const fileId = [...core.files.keys()][0]
    core.removeFile(fileId)

    const overrides = (core as any).fileOverrides as Map<string, any>
    expect(overrides.has(fileId)).toBe(false)

    core.destroy()
  })

  it('should clean up all overrides on removeAll', async () => {
    const core = new UpupCore({})

    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    await core.addFiles([f1, f2], { maxRetries: 3 })

    core.removeAll()

    const overrides = (core as any).fileOverrides as Map<string, any>
    expect(overrides.size).toBe(0)

    core.destroy()
  })
})
