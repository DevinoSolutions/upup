import { describe, it, expect, vi } from 'vitest'

// Simulate libheif-js not being installed. We use vi.doMock (not hoisted) to
// make the dynamic import() inside loadLibheif() reject, so our wrapper can
// catch it and throw an UpupError.
describe('heicToJpegBlob — optional dep missing', () => {
  it('throws an actionable UpupError naming libheif-js', async () => {
    vi.doMock('libheif-js/libheif-wasm/libheif-bundle.mjs', () => {
      throw new Error("Cannot find module 'libheif-js/libheif-wasm/libheif-bundle.mjs'")
    })

    // Patch globalThis.document so canvasBackendAvailable() returns true and
    // heicToJpegBlob actually reaches the import() call.
    const origDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    Object.defineProperty(globalThis, 'document', {
      value: { createElement: () => ({}) },
      configurable: true,
      writable: true,
    })

    try {
      // Reset module cache so heic-decode is re-imported with the new mock
      // (the libheifPromise memoisation must start fresh).
      vi.resetModules()
      const { heicToJpegBlob } = await import('../../src/steps/heic-decode')
      const blob = new Blob([new Uint8Array([0, 0, 0, 1])], { type: 'image/heic' })
      await expect(heicToJpegBlob(blob)).rejects.toThrow(/libheif-js/)
      await expect(heicToJpegBlob(blob)).rejects.toThrow(/npm i libheif-js/)
    } finally {
      if (origDescriptor) {
        Object.defineProperty(globalThis, 'document', origDescriptor)
      } else {
        delete (globalThis as { document?: Document }).document
      }
      vi.doUnmock('libheif-js/libheif-wasm/libheif-bundle.mjs')
      vi.resetModules()
    }
  })
})
