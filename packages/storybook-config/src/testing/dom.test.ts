import { describe, it, expect } from 'vitest'
import { waitFor, getRenderedFileNames, isJpegProduced, assertJpegProduced, captureRequests } from './dom'

function stubRoot(texts: string[]) {
  const nodes = texts.map((t) => ({ textContent: t }))
  return {
    querySelector: () => null,
    querySelectorAll: (sel: string) =>
      sel === '[data-testid="upup-file-item"]' ? nodes : [],
  } as unknown as Parameters<typeof getRenderedFileNames>[0]
}

describe('dom helpers', () => {
  it('getRenderedFileNames collapses whitespace of each file tile', () => {
    expect(getRenderedFileNames(stubRoot(['  sample.jpg   12.3 KB '])))
      .toEqual(['sample.jpg 12.3 KB'])
  })

  it('isJpegProduced detects .jpg / .jpeg tiles, not .heic', () => {
    expect(isJpegProduced(stubRoot(['sample.jpg 1 KB']))).toBe(true)
    expect(isJpegProduced(stubRoot(['photo.JPEG 1 KB']))).toBe(true)
    expect(isJpegProduced(stubRoot(['sample.heic 1 KB']))).toBe(false)
  })

  it('assertJpegProduced throws with the rendered names when none match', () => {
    expect(() => assertJpegProduced(stubRoot(['sample.heic 1 KB']))).toThrow(/sample\.heic/)
  })

  it('waitFor resolves the first truthy value', async () => {
    let n = 0
    const v = await waitFor(() => (++n >= 3 ? 'ok' : null), { interval: 1, timeout: 1000 })
    expect(v).toBe('ok')
  })

  it('waitFor rejects on timeout', async () => {
    await expect(waitFor(() => false, { interval: 1, timeout: 10 })).rejects.toThrow(/timed out/)
  })

  it('captureRequests records fetch url+body, delegates, and restores', async () => {
    const calls: unknown[][] = []
    const fakeFetch = ((...args: unknown[]) => {
      calls.push(args)
      return Promise.resolve('ok')
    }) as unknown as typeof fetch
    const target = { fetch: fakeFetch }

    const cap = captureRequests(target)
    await (target.fetch as unknown as (u: string, i?: { body?: string }) => Promise<unknown>)(
      '/api/upup-mock/presign',
      { body: '{"name":"sample.jpg","type":"image/jpeg","metadata":{"heicConverted":true}}' },
    )

    expect(cap.entries.some((e) => /sample\.jpg/.test(e))).toBe(true)
    expect(cap.entries.some((e) => /image\/jpeg/.test(e))).toBe(true)
    expect(calls.length).toBe(1) // delegated to the real fetch
    cap.restore()
    expect(target.fetch).toBe(fakeFetch) // original restored
  })
})
