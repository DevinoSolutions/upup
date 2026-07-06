import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { FileSource, UploadStatus, type UploadFile } from '../src/contracts'
import type { PipelineEngine } from '../src/pipeline/engine'

// Reaches into UpupCore's/PipelineEngine's private fields — there is no public
// accessor for the built step list, which is what these tests assert on.
type CoreInternals = { pipelineEngine: PipelineEngine | null }
type EngineInternals = { steps: Array<{ name: string }> }

function getStepNames(core: UpupCore): string[] {
    const engine = (core as unknown as CoreInternals).pipelineEngine
    if (!engine) return []
    return (engine as unknown as EngineInternals).steps.map(s => s.name)
}

// ─────────────────────────────────────────────
// Individual boolean option → step mapping
// ─────────────────────────────────────────────
describe('Dynamic pipeline — boolean option → step', () => {
    it('heicConversion adds a heic step', async () => {
        const core = new UpupCore({ heicConversion: true })
        try { await core.upload() } catch {
            // upup-catch: no endpoint configured; upload() is only called to trigger
            // lazy pipeline construction before inspecting step names — the rejection
            // itself is expected and irrelevant to this assertion.
        }
        expect(getStepNames(core).some(n => n.includes('heic'))).toBe(true)
        core.destroy()
    })

    it('stripExifData adds an exif step', async () => {
        const core = new UpupCore({ stripExifData: true })
        try { await core.upload() } catch {
            // upup-catch: no endpoint configured; upload() is only called to trigger
            // lazy pipeline construction before inspecting step names — the rejection
            // itself is expected and irrelevant to this assertion.
        }
        expect(getStepNames(core).some(n => n.includes('exif'))).toBe(true)
        core.destroy()
    })

    it('imageCompression adds a compress step', async () => {
        const core = new UpupCore({ imageCompression: true })
        try { await core.upload() } catch {
            // upup-catch: no endpoint configured; upload() is only called to trigger
            // lazy pipeline construction before inspecting step names — the rejection
            // itself is expected and irrelevant to this assertion.
        }
        expect(getStepNames(core).some(n => n.includes('compress'))).toBe(true)
        core.destroy()
    })

    it('checksumVerification adds a hash step', async () => {
        const core = new UpupCore({ checksumVerification: true })
        try { await core.upload() } catch {
            // upup-catch: no endpoint configured; upload() is only called to trigger
            // lazy pipeline construction before inspecting step names — the rejection
            // itself is expected and irrelevant to this assertion.
        }
        expect(getStepNames(core).some(n => n.includes('hash'))).toBe(true)
        core.destroy()
    })

    it('all boolean flags produce multiple steps', async () => {
        const core = new UpupCore({
            heicConversion: true,
            stripExifData: true,
            imageCompression: true,
            checksumVerification: true,
        })
        try { await core.upload() } catch {
            // upup-catch: no endpoint configured; upload() is only called to trigger
            // lazy pipeline construction before inspecting step names — the rejection
            // itself is expected and irrelevant to this assertion.
        }
        const names = getStepNames(core)
        expect(names.length).toBeGreaterThanOrEqual(4)
        core.destroy()
    })

    it('no boolean flags produce an empty pipeline', async () => {
        const core = new UpupCore({})
        try { await core.upload() } catch {
            // upup-catch: no endpoint configured; upload() is only called to trigger
            // lazy pipeline construction before inspecting step names — the rejection
            // itself is expected and irrelevant to this assertion.
        }
        expect((core as unknown as CoreInternals).pipelineEngine).toBeNull()
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// Explicit pipeline takes precedence
// ─────────────────────────────────────────────
describe('Dynamic pipeline — explicit pipeline', () => {
    it('explicit pipeline overrides boolean flags', async () => {
        const customStep = {
            name: 'my-custom',
            process: vi.fn(async (file: UploadFile) => file),
        }
        const core = new UpupCore({
            heicConversion: true,
            checksumVerification: true,
            pipeline: [customStep],
        })
        // Explicit pipeline is set immediately, not lazily
        const names = getStepNames(core)
        expect(names).toEqual(['my-custom'])
        core.destroy()
    })

    it('explicit empty pipeline prevents auto-build', async () => {
        const core = new UpupCore({
            heicConversion: true,
            pipeline: [],
        })
        const names = getStepNames(core)
        expect(names).toEqual([])
        core.destroy()
    })

    it('explicit pipeline with multiple steps preserves order', () => {
        const steps = [
            { name: 'first', process: vi.fn(async (f: UploadFile) => f) },
            { name: 'second', process: vi.fn(async (f: UploadFile) => f) },
            { name: 'third', process: vi.fn(async (f: UploadFile) => f) },
        ]
        const core = new UpupCore({ pipeline: steps })
        expect(getStepNames(core)).toEqual(['first', 'second', 'third'])
        core.destroy()
    })

    it('marks upload failed when a pipeline step throws', async () => {
        const onError = vi.fn()
        const uploadError = vi.fn()
        const core = new UpupCore({
            onError,
            pipeline: [
                {
                    name: 'explode',
                    process: vi.fn(async () => {
                        throw new Error('pipeline boom')
                    }),
                },
            ],
        })
        core.on('upload-error', uploadError)
        await core.addFiles([
            Object.assign(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), {
                id: 'photo',
                source: FileSource.LOCAL,
                status: UploadStatus.IDLE,
                metadata: {},
            }),
        ])

        await expect(core.upload()).rejects.toThrow('pipeline boom')

        expect(core.status).toBe(UploadStatus.FAILED)
        expect([...core.files.values()]).toHaveLength(1)
        expect([...core.files.values()][0]!.status).toBe(UploadStatus.FAILED)
        expect(core.error?.message).toBe('pipeline boom')
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'pipeline boom' }))
        expect(uploadError).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({ message: 'pipeline boom' }),
        }))
        core.destroy()
    })
})
