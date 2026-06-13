// src/testing/worker-heic-stories.ts
// The three WorkerHeic stories' args + play bodies, defined ONCE and consumed by
// every host's thin WorkerHeic.stories.* so they cannot drift. The plays touch
// only `canvasElement` + the framework-agnostic helpers.
import { buildHeicFile } from '../fixtures/heicSample'
import { buildPngFile } from '../fixtures/pngSample'
import { installWorkerProbe, getWorkerSpawnCount, resetWorkerProbe } from './worker-probe'
import { feedFile, waitFor, captureRequests, type RequestCapture } from './dom'

// The pipeline rewrites the file for upload (HEIC→JPEG) but the rendered tile
// keeps the original name, so we assert on what was actually uploaded: the
// presign request body carries the converted name/type/heicConverted flag.
const uploadedJpeg = (cap: RequestCapture): boolean =>
  cap.entries.some((e) => /\.jpe?g|image\/jpeg|heicConverted/i.test(e))

export type PlayContext = { canvasElement: HTMLElement }

// autoUpload:true is REQUIRED — the pipeline + worker run only inside
// core.upload(), which the orchestrator schedules on file-add.
export const workerHeicArgs: Record<
  'heicConversion' | 'webWorkerOffload' | 'mainThreadFallback',
  Record<string, unknown>
> = {
  heicConversion: { sources: ['local'], autoUpload: true, heicConversion: true, webWorker: false, showBranding: false },
  webWorkerOffload: { sources: ['local'], autoUpload: true, webWorker: true, imageCompression: true, thumbnailGenerator: true, checksumVerification: true },
  mainThreadFallback: { sources: ['local'], autoUpload: true, heicConversion: true, webWorker: false },
}

// HEIC decode (libheif WASM) can take a couple seconds in-browser.
const T = { timeout: 15000 } as const

function waitForInput(root: HTMLElement) {
  return waitFor(() => root.querySelector('input[type="file"]'), T)
}

export const workerHeicPlays: Record<
  'heicConversion' | 'webWorkerOffload' | 'mainThreadFallback',
  (ctx: PlayContext) => Promise<void>
> = {
  // 1. HEIC → JPEG on the main thread. Asserted via the upload payload (the
  //    converted .jpg is what gets sent), since the tile keeps the original name.
  async heicConversion({ canvasElement }) {
    const cap = captureRequests()
    try {
      await waitForInput(canvasElement)
      feedFile(canvasElement, buildHeicFile())
      await waitFor(() => uploadedJpeg(cap), T)
    } finally {
      cap.restore()
    }
  },

  // 2. Worker offload: a real Worker spawns for the pipeline (PNG → no HEIC dep).
  async webWorkerOffload({ canvasElement }) {
    installWorkerProbe()
    try {
      await waitForInput(canvasElement)
      feedFile(canvasElement, buildPngFile())
      await waitFor(() => getWorkerSpawnCount() > 0, T)
      if (getWorkerSpawnCount() < 1) throw new Error('webWorkerOffload: expected a Worker spawn, saw 0')
    } finally {
      resetWorkerProbe()
    }
  },

  // 3. Fallback parity: same HEIC→JPEG output (via upload payload), zero workers.
  async mainThreadFallback({ canvasElement }) {
    installWorkerProbe()
    const cap = captureRequests()
    try {
      await waitForInput(canvasElement)
      feedFile(canvasElement, buildHeicFile())
      await waitFor(() => uploadedJpeg(cap), T)
      const spawns = getWorkerSpawnCount()
      if (spawns !== 0) throw new Error(`mainThreadFallback: expected 0 workers, saw ${spawns}`)
    } finally {
      cap.restore()
      resetWorkerProbe()
    }
  },
}
