import { describe, it, expect } from 'vitest'
import { deduplicateStep } from '../../src/steps/deduplicate'
import type { UploadFile, PipelineContext } from '@upup/shared'

const makeFile = (id: string, content: string, name: string): UploadFile => {
  const file = new File([content], name, { type: 'text/plain' })
  return Object.assign(file, {
    id,
    url: null,
    relativePath: null,
    key: null,
    fileHash: null,
    checksumSHA256: null,
    etag: null,
    thumbnail: null,
  }) as unknown as UploadFile
}

describe('deduplicateStep', () => {
  it('returns a PipelineStep with name "deduplicate"', () => {
    const step = deduplicateStep()
    expect(step.name).toBe('deduplicate')
  })

  it('passes through unique files', async () => {
    const step = deduplicateStep()
    const file = makeFile('1', 'unique content', 'file.txt')
    const ctx: PipelineContext = {
      files: new Map([['1', file]]),
      options: {} as any,
      emit: () => {},
      t: ((k: string) => k) as any,
    }
    const result = await step.process(file, ctx)
    expect(result).toBe(file)
  })

  it('rejects files with same name and size as existing', async () => {
    const step = deduplicateStep()
    const existing = makeFile('1', 'same content here', 'dup.txt')
    const duplicate = makeFile('2', 'same content here', 'dup.txt')
    const ctx: PipelineContext = {
      files: new Map([['1', existing]]),
      options: {} as any,
      emit: () => {},
      t: ((k: string) => k) as any,
    }
    await expect(step.process(duplicate, ctx)).rejects.toThrow()
  })
})
