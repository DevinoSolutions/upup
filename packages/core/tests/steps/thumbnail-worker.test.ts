import { describe, it, expect, vi } from 'vitest'
import { thumbnailStep } from '../../src/steps/thumbnail'
import type { UploadFile, PipelineContext } from '../../src/contracts'

const makeImage = (): UploadFile => {
    const f = new File([new Uint8Array([1, 2, 3])], 'pic.png', {
        type: 'image/png',
    })
    return Object.assign(f, {
        id: 'i1',
        metadata: {},
        thumbnail: null,
    }) as unknown as UploadFile
}
const ctxBase = {
    files: new Map(),
    options: {} as Record<string, unknown>,
    emit: () => {},
    t: ((k: string) => k) as PipelineContext['t'],
}

describe('thumbnailStep worker branch', () => {
    it('applies the worker thumbnail result (url + rebuilt file)', async () => {
        const bytes = new Uint8Array([7, 7, 7, 7]).buffer
        const execute = vi.fn(async () => ({
            kind: 'thumbnail',
            thumbnailUrl: 'data:image/jpeg;base64,AAAA',
            bytes,
            type: 'image/jpeg',
            name: 'pic.png.thumbnail.jpg',
        }))
        const ctx: PipelineContext = {
            ...ctxBase,
            worker: { execute } as unknown as PipelineContext['worker'],
        }
        const out = await thumbnailStep().process(makeImage(), ctx)
        expect(execute).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'thumbnail' }),
        )
        expect(out.metadata!.thumbnailUrl).toBe('data:image/jpeg;base64,AAAA')
        expect(out.thumbnail?.file).toBeInstanceOf(File)
        expect(out.thumbnail!.file.type).toBe('image/jpeg')
        expect(out.thumbnail!.file.size).toBe(4)
    })

    it('falls back to the main thread when the worker throws (node → original file, no throw)', async () => {
        const execute = vi.fn(async () => {
            throw new Error('worker down')
        })
        const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
        const file = makeImage()
        const out = await thumbnailStep().process(file, ctx)
        expect(out).toBe(file) // createThumbnail returns null in node → step returns original
    })
})
