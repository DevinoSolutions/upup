import { describe, it, expect, vi } from 'vitest'
import { exifStep } from '../../src/steps/exif'
import type { UploadFile, PipelineContext } from '../../src/contracts'

const makeImage = (): UploadFile => {
    const f = new File([new Uint8Array([1, 2, 3])], 'pic.jpg', {
        type: 'image/jpeg',
    })
    return Object.assign(f, {
        id: 'e1',
        metadata: { keep: 'me' },
        checksumSHA256: 'keep',
    }) as unknown as UploadFile
}
const ctxBase = {
    files: new Map(),
    options: {} as Record<string, unknown>,
    emit: () => {},
    t: ((k: string) => k) as PipelineContext['t'],
}

describe('exifStep worker branch', () => {
    it('rebuilds the file from the worker image result, merging metadata', async () => {
        const bytes = new Uint8Array([2, 2, 2, 2, 2]).buffer
        const execute = vi.fn(async () => ({
            kind: 'image',
            bytes,
            type: 'image/jpeg',
            name: 'pic.jpg',
            metadata: { exifStripped: true, processedSize: 5 },
        }))
        const ctx: PipelineContext = {
            ...ctxBase,
            worker: { execute } as unknown as PipelineContext['worker'],
        }
        const out = await exifStep().process(makeImage(), ctx)
        expect(execute).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'exif' }),
        )
        expect(out.size).toBe(5)
        expect(out.metadata).toMatchObject({ keep: 'me', exifStripped: true })
        expect(out.checksumSHA256).toBe('keep')
    })

    it('falls back to the main thread when the worker throws (node → original file)', async () => {
        const execute = vi.fn(async () => {
            throw new Error('worker down')
        })
        const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
        const file = makeImage()
        const out = await exifStep().process(file, ctx)
        expect(out).toBe(file) // encodeImageFile returns null in node → step returns original
    })
})
