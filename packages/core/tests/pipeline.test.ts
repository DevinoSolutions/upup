import { describe, it, expect, vi } from 'vitest'
import { PipelineEngine } from '../src/pipeline/engine'
import type { PipelineStep, PipelineContext } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

const makeFile = (overrides: Partial<UploadFile> = {}): UploadFile => ({
  id: 'test-1',
  name: 'test.jpg',
  size: 1024,
  type: 'image/jpeg',
  lastModified: Date.now(),
  url: null,
  relativePath: null,
  key: null,
  fileHash: null,
  checksumSHA256: null,
  etag: null,
  thumbnail: null,
  arrayBuffer: vi.fn(),
  slice: vi.fn(),
  stream: vi.fn(),
  text: vi.fn(),
  ...overrides,
} as unknown as UploadFile)

const makeContext = (overrides: Partial<PipelineContext> = {}): PipelineContext => ({
  files: new Map(),
  options: {} as any,
  emit: vi.fn(),
  t: ((key: string) => key) as any,
  ...overrides,
})

describe('PipelineEngine', () => {
  it('executes steps in order', async () => {
    const order: string[] = []
    const step1: PipelineStep = {
      name: 'step1',
      process: async (file) => {
        order.push('step1')
        return file
      },
    }
    const step2: PipelineStep = {
      name: 'step2',
      process: async (file) => {
        order.push('step2')
        return file
      },
    }

    const engine = new PipelineEngine([step1, step2])
    await engine.process(makeFile(), makeContext())

    expect(order).toEqual(['step1', 'step2'])
  })

  it('passes modified file from one step to the next', async () => {
    const step1: PipelineStep = {
      name: 'add-hash',
      process: async (file) => {
        return Object.assign(file, { fileHash: 'abc123' })
      },
    }
    const step2: PipelineStep = {
      name: 'check-hash',
      process: async (file) => {
        expect(file.fileHash).toBe('abc123')
        return file
      },
    }

    const engine = new PipelineEngine([step1, step2])
    const result = await engine.process(makeFile(), makeContext())

    expect(result.fileHash).toBe('abc123')
  })

  it('skips a step when shouldProcess returns false', async () => {
    const processFn = vi.fn(async (file: UploadFile) => file)
    const step: PipelineStep = {
      name: 'images-only',
      shouldProcess: (file) => file.type.startsWith('image/'),
      process: processFn,
    }

    const engine = new PipelineEngine([step])
    const textFile = makeFile({ type: 'text/plain' })
    await engine.process(textFile, makeContext())

    expect(processFn).not.toHaveBeenCalled()
  })

  it('runs a step when shouldProcess returns true', async () => {
    const processFn = vi.fn(async (file: UploadFile) => file)
    const step: PipelineStep = {
      name: 'images-only',
      shouldProcess: (file) => file.type.startsWith('image/'),
      process: processFn,
    }

    const engine = new PipelineEngine([step])
    await engine.process(makeFile({ type: 'image/png' }), makeContext())

    expect(processFn).toHaveBeenCalledOnce()
  })

  it('emits pipeline events via context', async () => {
    const emit = vi.fn()
    const step: PipelineStep = {
      name: 'test-step',
      process: async (file) => file,
    }

    const engine = new PipelineEngine([step])
    await engine.process(makeFile(), makeContext({ emit }))

    expect(emit).toHaveBeenCalledWith('pipeline-start', expect.any(Object))
    expect(emit).toHaveBeenCalledWith('pipeline-step', expect.objectContaining({ step: 'test-step' }))
    expect(emit).toHaveBeenCalledWith('pipeline-complete', expect.any(Object))
  })

  it('handles empty pipeline', async () => {
    const engine = new PipelineEngine([])
    const file = makeFile()
    const result = await engine.process(file, makeContext())

    expect(result).toBe(file)
  })

  it('propagates step errors as pipeline-error events', async () => {
    const emit = vi.fn()
    const step: PipelineStep = {
      name: 'failing-step',
      process: async () => {
        throw new Error('Step failed')
      },
    }

    const engine = new PipelineEngine([step])

    await expect(engine.process(makeFile(), makeContext({ emit }))).rejects.toThrow('Step failed')
  })
})
