import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TusUpload } from '../../src/strategies/tus-upload'

const tusCalls = vi.hoisted(() => [] as Array<{ source: File | Blob; options: Record<string, any> }>)

vi.mock('tus-js-client', () => ({
  Upload: class MockTusUpload {
    url = 'https://tus.example/uploads/1'

    constructor(source: File | Blob, options: Record<string, any>) {
      tusCalls.push({ source, options })
    }

    start() {
      tusCalls.at(-1)?.options.onProgress?.(10, 10)
      tusCalls.at(-1)?.options.onSuccess?.()
    }

    abort() {
      return Promise.resolve()
    }
  },
}))

describe('TusUpload', () => {
  beforeEach(() => {
    tusCalls.length = 0
  })

  it('maps chunkSizeBytes to tus-js chunkSize and preserves the native File body', async () => {
    const file = new File(['hello tus'], 'hello.txt', { type: 'text/plain' })
    const progress = vi.fn()
    const strategy = new TusUpload({
      protocol: 'tus',
      endpoint: '/files',
      chunkSizeBytes: 1024,
    })

    await strategy.upload(file, { key: file.name, uploadUrl: '', expiresIn: 0 }, {
      onProgress: progress,
      signal: new AbortController().signal,
    })

    expect(tusCalls).toHaveLength(1)
    expect(tusCalls[0].source).toBe(file)
    expect(tusCalls[0].options.chunkSize).toBe(1024)
    expect(progress).toHaveBeenCalledWith(10, 10)
  })

  it('omits undefined tus-js options so library defaults are not overwritten', async () => {
    const file = new File(['hello tus'], 'hello.txt', { type: 'text/plain' })
    const strategy = new TusUpload({
      protocol: 'tus',
      endpoint: '/files',
    })

    await strategy.upload(file, { key: file.name, uploadUrl: '', expiresIn: 0 }, {
      onProgress: vi.fn(),
      signal: new AbortController().signal,
    })

    expect(Object.prototype.hasOwnProperty.call(tusCalls[0].options, 'chunkSize')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(tusCalls[0].options, 'retryDelays')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(tusCalls[0].options, 'parallelUploads')).toBe(false)
  })
})
