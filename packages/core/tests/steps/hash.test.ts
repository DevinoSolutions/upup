import { describe, it, expect } from 'vitest'
import { hashStep } from '../../src/steps/hash'
import type { UploadFile, PipelineContext } from '@upup/shared'

const makeFile = (content: string): UploadFile => {
  const file = new File([content], 'test.txt', { type: 'text/plain' })
  return Object.assign(file, {
    id: 'test-1',
    url: null,
    relativePath: null,
    key: null,
    fileHash: null,
    checksumSHA256: null,
    etag: null,
    thumbnail: null,
  }) as unknown as UploadFile
}

const makeContext = (): PipelineContext => ({
  files: new Map(),
  options: {} as any,
  emit: () => {},
  t: ((k: string) => k) as any,
})

describe('hashStep', () => {
  it('returns a PipelineStep with name "hash"', () => {
    const step = hashStep()
    expect(step.name).toBe('hash')
  })

  it('computes SHA-256 hash and sets checksumSHA256', async () => {
    const step = hashStep()
    const file = makeFile('hello world')
    const result = await step.process(file, makeContext())
    expect(result.checksumSHA256).toBeDefined()
    expect(typeof result.checksumSHA256).toBe('string')
    expect(result.checksumSHA256!.length).toBe(64)
  })

  it('produces consistent hashes for same content', async () => {
    const step = hashStep()
    const file1 = makeFile('same content')
    const file2 = makeFile('same content')
    file2.id = 'test-2'
    const ctx = makeContext()
    const r1 = await step.process(file1, ctx)
    const r2 = await step.process(file2, ctx)
    expect(r1.checksumSHA256).toBe(r2.checksumSHA256)
  })

  it('produces different hashes for different content', async () => {
    const step = hashStep()
    const file1 = makeFile('content A')
    const file2 = makeFile('content B')
    file2.id = 'test-2'
    const ctx = makeContext()
    const r1 = await step.process(file1, ctx)
    const r2 = await step.process(file2, ctx)
    expect(r1.checksumSHA256).not.toBe(r2.checksumSHA256)
  })
})
