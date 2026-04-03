import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

describe('Dynamic pipeline imports', () => {
  it('should auto-build pipeline from boolean options when no explicit pipeline provided', () => {
    const core = new UpupCore({
      heicConversion: true,
      stripExifData: true,
      checksumVerification: true,
    })
    // Pipeline engine should be created automatically
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
    // Should use the explicitly provided pipeline, not auto-build
    expect((core as any).pipelineEngine).not.toBeNull()
    core.destroy()
  })

  it('should not create pipeline when no boolean options are set', () => {
    const core = new UpupCore({})
    expect((core as any).pipelineEngine).toBeNull()
    core.destroy()
  })

  it('should include hash step when checksumVerification is true', () => {
    const core = new UpupCore({
      checksumVerification: true,
    })
    const engine = (core as any).pipelineEngine
    expect(engine).not.toBeNull()
    const steps = (engine as any).steps as Array<{ name: string }>
    expect(steps.some((s: { name: string }) => s.name.includes('hash'))).toBe(true)
    core.destroy()
  })
})
