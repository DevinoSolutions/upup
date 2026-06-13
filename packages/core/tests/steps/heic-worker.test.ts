import { describe, it, expect, vi } from 'vitest'
import { heicStep } from '../../src/steps/heic'
import type { UploadFile, PipelineContext } from '../../src/contracts'

const makeHeic = (): UploadFile => {
  const f = new File([new Uint8Array([1, 2, 3])], 'photo.heic', { type: 'image/heic' })
  return Object.assign(f, { id: 'h1', metadata: {}, checksumSHA256: 'keep' }) as unknown as UploadFile
}
const ctxBase = { files: new Map(), options: {} as Record<string, unknown>, emit: () => {}, t: ((k: string) => k) as PipelineContext['t'] }

describe('heicStep worker branch', () => {
  it('rebuilds the file from the worker image result', async () => {
    const bytes = new Uint8Array([5, 5, 5, 5]).buffer
    const execute = vi.fn(async () => ({ kind: 'image', bytes, type: 'image/jpeg', name: 'photo.jpg', metadata: { heicConverted: true } }))
    const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
    const out = await heicStep().process(makeHeic(), ctx)
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ type: 'heic' }))
    expect(out.name).toBe('photo.jpg')
    expect(out.type).toBe('image/jpeg')
    expect(out.size).toBe(4)
    expect(out.metadata!.heicConverted).toBe(true)
    expect(out.checksumSHA256).toBe('keep')
  })

  it('falls back to the main thread when the worker throws (node → original file)', async () => {
    const execute = vi.fn(async () => { throw new Error('worker down') })
    const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
    const file = makeHeic()
    const out = await heicStep().process(file, ctx)
    expect(out).toBe(file) // main-thread heic returns original on failure
  })
})
