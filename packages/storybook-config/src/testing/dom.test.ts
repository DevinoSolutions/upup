import { describe, it, expect } from 'vitest'
import { waitFor, getRenderedFileNames, isJpegProduced, assertJpegProduced, captureRequests, feedFile, feedFileUntil } from './dom'

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

  it('feedFile fires change by default and honors an explicit events list', () => {
    const events: string[] = []
    const input = new EventTarget() as unknown as HTMLInputElement
    input.addEventListener('input', (e) => events.push(e.type))
    input.addEventListener('change', (e) => events.push(e.type))
    const root = {
      querySelector: (sel: string) =>
        sel === 'input[type="file"]' ? (input as unknown as Element) : null,
    } as unknown as ParentNode

    const g = globalThis as { DataTransfer?: unknown }
    const Orig = g.DataTransfer
    g.DataTransfer = class {
      items = { add: (_f: unknown) => {} }
      files = [] as unknown as FileList
    }
    try {
      feedFile(root, { name: 'sample.png', type: 'image/png' } as File)
      expect(events).toEqual(['change'])
      feedFile(root, { name: 'sample.png', type: 'image/png' } as File, ['input', 'change'])
      expect(events).toEqual(['change', 'input', 'change'])
    } finally {
      g.DataTransfer = Orig
    }
  })

  it('feedFileUntil stops after change when the host registers on it (react/vue/svelte/vanilla)', async () => {
    const events: string[] = []
    let registered = false
    const input = new EventTarget() as unknown as HTMLInputElement
    input.addEventListener('change', () => { events.push('change'); registered = true })
    input.addEventListener('input', () => { events.push('input') })
    const root = {
      querySelector: (sel: string) =>
        sel === 'input[type="file"]' ? (input as unknown as Element) : null,
    } as unknown as ParentNode

    const g = globalThis as { DataTransfer?: unknown }
    const Orig = g.DataTransfer
    g.DataTransfer = class {
      items = { add: (_f: unknown) => {} }
      files = [] as unknown as FileList
    }
    try {
      await feedFileUntil(root, { name: 'x.png' } as File, () => registered, { timeout: 1000, interval: 10 })
    } finally {
      g.DataTransfer = Orig
    }
    expect(events).toContain('change')
    expect(events).not.toContain('input')
  })

  it('feedFileUntil escalates to input when change does not register (preact/compat)', async () => {
    const events: string[] = []
    let registered = false
    const input = new EventTarget() as unknown as HTMLInputElement
    input.addEventListener('change', () => { events.push('change') })
    input.addEventListener('input', () => { events.push('input'); registered = true })
    const root = {
      querySelector: (sel: string) =>
        sel === 'input[type="file"]' ? (input as unknown as Element) : null,
    } as unknown as ParentNode

    const g = globalThis as { DataTransfer?: unknown }
    const Orig = g.DataTransfer
    g.DataTransfer = class {
      items = { add: (_f: unknown) => {} }
      files = [] as unknown as FileList
    }
    try {
      await feedFileUntil(root, { name: 'x.png' } as File, () => registered, { timeout: 1000, interval: 10 })
    } finally {
      g.DataTransfer = Orig
    }
    expect(events).toContain('input')
  })

  it('feedFileUntil throws if the file never registers', async () => {
    const input = new EventTarget() as unknown as HTMLInputElement
    const root = {
      querySelector: (sel: string) =>
        sel === 'input[type="file"]' ? (input as unknown as Element) : null,
    } as unknown as ParentNode

    const g = globalThis as { DataTransfer?: unknown }
    const Orig = g.DataTransfer
    g.DataTransfer = class {
      items = { add: (_f: unknown) => {} }
      files = [] as unknown as FileList
    }
    try {
      await expect(
        feedFileUntil(root, { name: 'x.png' } as File, () => false, { timeout: 60, interval: 10 }),
      ).rejects.toThrow(/did not register/)
    } finally {
      g.DataTransfer = Orig
    }
  })
})
