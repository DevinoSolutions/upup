import { describe, expect, it } from 'vitest'

describe('@upup/next', () => {
  it('exposes a client entry with the use client directive', async () => {
    const source = await import('../src/client')
    expect(source.FileSource.LOCAL).toBe('local')
    expect(source.UpupUploader).toBeTruthy()
  })

  it('exposes the Next route handler helper from the server entry', async () => {
    const source = await import('../src/server')
    expect(typeof source.createUpupHandler).toBe('function')
  })
})

