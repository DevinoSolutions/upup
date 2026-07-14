// src/fixtures/base64.ts
// Tiny base64 → bytes decoder shared by the binary fixtures. Uses the global
// atob (present in browsers and Node ≥18), so the fixtures stay bundler-agnostic.
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
