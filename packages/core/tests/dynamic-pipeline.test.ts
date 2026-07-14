import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import type { PipelineEngine } from '../src/pipeline/engine'
import type { UploadFile } from '../src/contracts'

// Test-only accessor for UpupCore's private lazily-built pipeline cache —
// there is no public getter, and these tests exist specifically to pin the
// private lazy-build/reset behavior.
function getPipelineEngine(core: UpupCore): PipelineEngine | null {
    return (core as unknown as { pipelineEngine: PipelineEngine | null })
        .pipelineEngine
}

function getStepNames(engine: PipelineEngine): string[] {
    return (engine as unknown as { steps: Array<{ name: string }> }).steps.map(
        s => s.name,
    )
}

describe('Dynamic pipeline imports', () => {
    it('should auto-build pipeline from boolean options during upload', async () => {
        const core = new UpupCore({
            heicConversion: true,
            stripExifData: true,
            checksumVerification: true,
        })
        // Pipeline is built lazily during upload(), not in constructor
        expect(getPipelineEngine(core)).toBeNull()

        // Trigger upload to build auto-pipeline (will fail upload but pipeline gets built)
        try {
            await core.upload()
        } catch {
            /* upup-catch: expected — no upload endpoint configured in this fixture */
        }

        expect(getPipelineEngine(core)).not.toBeNull()
        core.destroy()
    })

    it('should not auto-build pipeline when explicit pipeline is provided', () => {
        const mockStep = {
            name: 'custom-step',
            process: vi.fn(async (file: UploadFile) => file),
        }
        const core = new UpupCore({
            heicConversion: true,
            pipeline: [mockStep],
        })
        // Explicit pipeline is set in constructor
        expect(getPipelineEngine(core)).not.toBeNull()
        core.destroy()
    })

    it('should not create pipeline when no boolean options are set', async () => {
        const core = new UpupCore({})

        try {
            await core.upload()
        } catch {
            /* upup-catch: expected — no upload endpoint configured in this fixture */
        }

        expect(getPipelineEngine(core)).toBeNull()
        core.destroy()
    })

    it('should include hash step when checksumVerification is true', async () => {
        const core = new UpupCore({
            checksumVerification: true,
        })

        try {
            await core.upload()
        } catch {
            /* upup-catch: expected — no upload endpoint configured in this fixture */
        }

        const engine = getPipelineEngine(core)
        expect(engine).not.toBeNull()
        const steps = getStepNames(engine as PipelineEngine)
        expect(steps.some(name => name.includes('hash'))).toBe(true)
        core.destroy()
    })
})
