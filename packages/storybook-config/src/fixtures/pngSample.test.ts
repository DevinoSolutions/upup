import { describe, it, expect } from 'vitest'
import { buildPngFile } from './pngSample'

describe('buildPngFile', () => {
  it('builds a non-empty image/png File with the PNG magic signature', async () => {
    const f = buildPngFile()
    expect(f.type).toBe('image/png')
    expect(f.name).toBe('sample.png')
    expect(f.size).toBeGreaterThan(8)
    const bytes = new Uint8Array(await f.arrayBuffer())
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(Array.from(bytes.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  it('honors a custom name', () => {
    expect(buildPngFile('x.png').name).toBe('x.png')
  })
})
