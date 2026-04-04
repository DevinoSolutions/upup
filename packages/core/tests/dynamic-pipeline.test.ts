import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

describe('Dynamic pipeline imports', () => {
  it('should auto-build pipeline from boolean options during upload', async () => {
    const core = new UpupCore({
      heicConversion: true,
      stripExifData: true,
      checksumVerification: true,
    })
    // Pipeline is built lazily during upload(), not in constructor
    expect((core as any).pipelineEngine).toBeNull()

    // Trigger upload to build auto-pipeline (will fail upload but pipeline gets built)
    try { await core.upload() } catch { /* expected — no upload endpoint */ }

    expect((core as any).pipelineEngine).not.toBeNull()
    core.destroy()
  })

  it('should not auto-build pipeline when explicit pipeline is provided', () => {
    const mockStep = {
      name: 'custom-step',
      process: vi.fn(async (file: any) => file),
    }
    const core = new UpupCore({
      heicConversion: true,
      pipeline: [mockStep],
    })
    // Explicit pipeline is set in constructor
    expect((core as any).pipelineEngine).not.toBeNull()
    core.destroy()
  })

  it('should not create pipeline when no boolean options are set', async () => {
    const core = new UpupCore({})

    try { await core.upload() } catch { /* expected */ }

    expect((core as any).pipelineEngine).toBeNull()
    core.destroy()
  })

  it('should include hash step when checksumVerification is true', async () => {
    const core = new UpupCore({
      checksumVerification: true,
    })

    try { await core.upload() } catch { /* expected */ }

    const engine = (core as any).pipelineEngine
    expect(engine).not.toBeNull()
    const steps = (engine as any).steps as Array<{ name: string }>
    expect(steps.some((s: { name: string }) => s.name.includes('hash'))).toBe(true)
    core.destroy()
  })
})
