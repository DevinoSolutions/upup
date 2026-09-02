// src/fixtures/base64.ts
// Tiny base64 → bytes decoder shared by the binary fixtures. Uses the global
// atob (present in browsers and Node ≥18), so the fixtures stay bundler-agnostic.
// The return type is left inferred (Uint8Array<ArrayBuffer> under TypeScript
// >= 5.7, plain Uint8Array before it). Annotating it as bare `Uint8Array`
// widens to Uint8Array<ArrayBufferLike> on the newer lib, which BlobPart
// rejects at the `new File([...])` call sites.
export function base64ToBytes(b64: string) {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
}
