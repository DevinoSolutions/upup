import { describe, it, expect } from 'vitest'
import { buildHeicFile } from './heicSample'

describe('buildHeicFile', () => {
  it('builds a non-empty image/heic File with an ISO-BMFF ftyp box', async () => {
    const f = buildHeicFile()
    expect(f.type).toBe('image/heic')
    expect(f.name).toBe('sample.heic')
    expect(f.size).toBeGreaterThan(32)
    const bytes = new Uint8Array(await f.arrayBuffer())
    // bytes 4..8 of an ISO-BMFF/HEIF file are the 'ftyp' box type
    expect(String.fromCharCode(...bytes.slice(4, 8))).toBe('ftyp')
  })

  it('honors a custom name', () => {
    expect(buildHeicFile('x.heic').name).toBe('x.heic')
  })
})
