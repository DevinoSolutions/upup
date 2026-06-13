import { describe, it, expect } from 'vitest'
import type { WorkerRequest, WorkerResponse, WorkerResult } from '../../src/worker/protocol'
import { PipelineEngine } from '../../src/pipeline/engine'

describe('worker protocol', () => {
  it('models a request with optional params', () => {
    const req: WorkerRequest = { id: 1, type: 'hash', data: new ArrayBuffer(8) }
    const withParams: WorkerRequest = { id: 2, type: 'compress', data: new ArrayBuffer(8), params: { mime: 'image/png' } }
    expect(req.type).toBe('hash')
    expect(withParams.params?.mime).toBe('image/png')
  })

  it('discriminates result variants by kind', () => {
    const results: WorkerResult[] = [
      { kind: 'hash', checksum: 'abc' },
      { kind: 'thumbnail', thumbnailUrl: 'data:', bytes: new ArrayBuffer(2), type: 'image/jpeg', name: 't.jpg' },
      { kind: 'image', bytes: new ArrayBuffer(2), type: 'image/jpeg', name: 'a.jpg', metadata: { compressed: true } },
    ]
    expect(results.map(r => r.kind)).toEqual(['hash', 'thumbnail', 'image'])
  })

  it('models ok/error responses', () => {
    const ok: WorkerResponse = { id: 1, ok: true, result: { kind: 'hash', checksum: 'x' } }
    const err: WorkerResponse = { id: 2, ok: false, error: 'boom' }
    expect(ok.ok && ok.result.kind).toBe('hash')
    expect(!err.ok && err.error).toBe('boom')
  })

  it('PipelineEngine exposes stepCount', () => {
    const engine = new PipelineEngine([{ name: 'a', process: async f => f }])
    expect(engine.stepCount).toBe(1)
    expect(new PipelineEngine([]).stepCount).toBe(0)
  })
})
