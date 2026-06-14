declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  /** Shape libheif's `display` fills: a buffer plus its dimensions. */
  export interface HeifDisplayData {
    data: Uint8ClampedArray
    width: number
    height: number
  }

  export interface HeifImage {
    get_width(): number
    get_height(): number
    /** Renders RGBA into `target.data`; calls back with the filled object or a falsy value on failure. */
    display(target: HeifDisplayData, cb: (result: HeifDisplayData | null | undefined) => void): void
    /** Releases the underlying heif_image_handle (WASM memory). */
    free(): void
  }

  export interface HeifDecoder {
    /** Decodes a HEIC/HEIF byte array into one or more images. */
    decode(data: Uint8Array): HeifImage[]
    /** Raw heif_context pointer; pass to `heif_context_free`. */
    decoder: unknown
  }

  export interface Libheif {
    HeifDecoder: { new (): HeifDecoder }
    /** Frees a heif_context allocated by a decoder. */
    heif_context_free(context: unknown): void
  }

  /** The bundle's default export is a factory returning the initialized module. */
  const factory: () => Promise<Libheif>
  export default factory
}
