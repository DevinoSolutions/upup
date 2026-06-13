import { describe, it, expect, vi } from 'vitest'
import { compressStep } from '../../src/steps/compress'
import type { UploadFile, PipelineContext } from '../../src/contracts'

const makeImage = (): UploadFile => {
  const f = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'pic.jpg', { type: 'image/jpeg' })
  return Object.assign(f, { id: 'c1', metadata: { keep: 'me' }, checksumSHA256: 'keep' }) as unknown as UploadFile
}
const ctxBase = { files: new Map(), options: {} as Record<string, unknown>, emit: () => {}, t: ((k: string) => k) as PipelineContext['t'] }

describe('compressStep worker branch', () => {
  it('rebuilds the file from the worker image result', async () => {
    const bytes = new Uint8Array([9, 9, 9]).buffer
    const execute = vi.fn(async () => ({ kind: 'image', bytes, type: 'image/jpeg', name: 'pic.jpg', metadata: { compressed: true, processedSize: 3 } }))
    const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
    const out = await compressStep({ maxSizeMB: 1 }).process(makeImage(), ctx)
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ type: 'compress' }))
    expect(out.size).toBe(3)
    expect(out.metadata).toMatchObject({ keep: 'me', compressed: true })
    expect(out.checksumSHA256).toBe('keep')
  })

  it('falls back to the main thread when the worker throws (node → original file)', async () => {
    const execute = vi.fn(async () => { throw new Error('worker down') })
    const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
    const file = makeImage()
    const out = await compressStep().process(file, ctx)
    expect(out).toBe(file) // encodeImageFile returns null in node → compress returns original
  })
})
