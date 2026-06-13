import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleTask } from '../../src/worker/handle-task'

const refHash = async (buf: ArrayBuffer) => {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('handleTask', () => {
  beforeEach(() => vi.resetModules())

  it('hashes data with SHA-256 (real, runs in node)', async () => {
    const data = new TextEncoder().encode('hello world').buffer
    const res = await handleTask({ id: 7, type: 'hash', data })
    expect(res.id).toBe(7)
    expect(res.ok).toBe(true)
    if (res.ok && res.result.kind === 'hash') {
      expect(res.result.checksum).toBe(await refHash(data))
      expect(res.result.checksum.length).toBe(64)
    } else throw new Error('expected hash result')
  })

  it('returns ok:false for image tasks when no canvas is available (node)', async () => {
    const data = new Uint8Array([0xff, 0xd8, 0xff]).buffer
    for (const type of ['exif', 'compress', 'thumbnail'] as const) {
      const res = await handleTask({ id: 1, type, data, params: { mime: 'image/jpeg', name: 'a.jpg' } })
      expect(res.ok).toBe(false)
    }
  })

  it('converts heic via heic2any (mocked) into an image result', async () => {
    vi.doMock('heic2any', () => ({
      default: vi.fn(async () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' })),
    }))
    const { handleTask: ht } = await import('../../src/worker/handle-task')
    const res = await ht({ id: 5, type: 'heic', data: new ArrayBuffer(8), params: { mime: 'image/heic', name: 'p.heic' } })
    expect(res.ok).toBe(true)
    if (res.ok && res.result.kind === 'image') {
      expect(res.result.type).toBe('image/jpeg')
      expect(res.result.name).toBe('p.jpg')
      expect(res.result.bytes.byteLength).toBe(4)
      expect(res.result.metadata).toMatchObject({ heicConverted: true })
    } else throw new Error('expected image result')
  })

  it('returns ok:false when heic2any throws', async () => {
    vi.doMock('heic2any', () => ({ default: vi.fn(async () => { throw new Error('no codec') }) }))
    const { handleTask: ht } = await import('../../src/worker/handle-task')
    const res = await ht({ id: 6, type: 'heic', data: new ArrayBuffer(8), params: { mime: 'image/heic', name: 'p.heic' } })
    expect(res.ok).toBe(false)
  })

  it('never throws on unknown task type', async () => {
    // @ts-expect-error intentional bad type
    const res = await handleTask({ id: 9, type: 'nope', data: new ArrayBuffer(2) })
    expect(res.ok).toBe(false)
  })
})
