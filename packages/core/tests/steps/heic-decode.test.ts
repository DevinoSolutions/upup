import { describe, it, expect, vi, beforeEach } from 'vitest'

// A fake libheif whose image/context expose spies so we can assert cleanup.
function installFakeLibheif() {
  const free = vi.fn()
  const heif_context_free = vi.fn()
  const image = {
    get_width: () => 2,
    get_height: () => 2,
    display: (target: { data: Uint8ClampedArray }, cb: (r: unknown) => void) => cb(target),
    free,
  }
  const decode = vi.fn(() => [image])
  class HeifDecoder { decoder = { ptr: 1 }; decode = decode }
  const libheif = { HeifDecoder, heif_context_free }
  vi.doMock('libheif-js/libheif-wasm/libheif-bundle.mjs', () => ({ default: () => Promise.resolve(libheif) }))
  return { free, heif_context_free, decode, image }
}

// Minimal OffscreenCanvas + 2D context so the helper runs in node.
function installCanvas(blobContent = 'jpeg') {
  vi.stubGlobal('OffscreenCanvas', class {
    width: number; height: number
    constructor(w: number, h: number) { this.width = w; this.height = h }
    getContext() {
      return {
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        putImageData: vi.fn(),
      }
    }
    async convertToBlob(opts: { type?: string }) { return new Blob([blobContent], { type: opts.type || 'image/jpeg' }) }
  })
}

describe('heicToJpegBlob', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals() })

  it('decodes to a jpeg blob and frees the image handle + context', async () => {
    const spies = installFakeLibheif()
    installCanvas('converted')
    const { heicToJpegBlob } = await import('../../src/steps/heic-decode')

    const blob = await heicToJpegBlob(new Blob([new Uint8Array([1, 2, 3])]), { quality: 0.9 })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob!.type).toBe('image/jpeg')
    expect(spies.decode).toHaveBeenCalledTimes(1)
    expect(spies.free).toHaveBeenCalledTimes(1)        // image freed
    expect(spies.heif_context_free).toHaveBeenCalledTimes(1) // context freed
  })

  it('frees the image handle + context even when display fails (no leak on error)', async () => {
    const free = vi.fn()
    const heif_context_free = vi.fn()
    const image = { get_width: () => 2, get_height: () => 2, display: (_t: unknown, cb: (r: unknown) => void) => cb(null), free }
    class HeifDecoder { decoder = { ptr: 1 }; decode = () => [image] }
    vi.doMock('libheif-js/libheif-wasm/libheif-bundle.mjs', () => ({ default: () => Promise.resolve({ HeifDecoder, heif_context_free }) }))
    installCanvas()
    const { heicToJpegBlob } = await import('../../src/steps/heic-decode')

    await expect(heicToJpegBlob(new Blob([new Uint8Array([1])]), { quality: 0.9 })).rejects.toThrow(/display/i)
    expect(free).toHaveBeenCalledTimes(1)
    expect(heif_context_free).toHaveBeenCalledTimes(1)
  })

  it('returns null (not an error) when no canvas is available', async () => {
    installFakeLibheif()
    // No installCanvas(): OffscreenCanvas undefined and no document → createCanvas returns null.
    const { heicToJpegBlob } = await import('../../src/steps/heic-decode')
    const blob = await heicToJpegBlob(new Blob([new Uint8Array([1])]), { quality: 0.9 })
    expect(blob).toBeNull()
  })
})
