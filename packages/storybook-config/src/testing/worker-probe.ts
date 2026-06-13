// src/testing/worker-probe.ts
// Counts real Worker constructions so a story can prove the pipeline ran (or did
// NOT run) in a Web Worker. Wraps the global Worker constructor — the same global
// that @upup/core's runtime/browser.ts calls via `new Worker(url)`.

type WorkerCtorHost = { Worker?: unknown }

let host: WorkerCtorHost | null = null
let original: unknown = null
let count = 0

/**
 * Wrap the Worker constructor on `target` (defaults to globalThis) so every
 * `new Worker(...)` increments a counter. Idempotent: restores any prior wrap
 * first, then re-wraps, and always resets the count to 0. Preserves `prototype`
 * so `instanceof` and the real worker behavior are unaffected.
 */
export function installWorkerProbe(
  target: WorkerCtorHost = globalThis as unknown as WorkerCtorHost,
): void {
  resetWorkerProbe() // never double-wrap
  host = target
  original = target.Worker
  count = 0
  const Original = original as { new (...args: unknown[]): object } | undefined
  if (typeof Original !== 'function') return
  function ProbeWorker(this: unknown, ...args: unknown[]) {
    count++
    return new Original!(...args)
  }
  ProbeWorker.prototype = Original.prototype
  target.Worker = ProbeWorker as unknown
}

export function getWorkerSpawnCount(): number {
  return count
}

/** Restore the original Worker constructor (if wrapped). Safe to call anytime. */
export function resetWorkerProbe(): void {
  if (host && original !== null) host.Worker = original
  host = null
  original = null
}
