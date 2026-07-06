import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import * as createWorkerProviderModule from '../src/worker/create-worker-provider'

describe('core worker wiring (headless / node)', () => {
  it('accepts the webWorker option without affecting headless processing', async () => {
    const core = new UpupCore({ checksumVerification: true, webWorker: false })
    const f = new File(['hello'], 'a.txt', { type: 'text/plain' })
    await core.setFiles([f])
    try { await core.upload() } catch { /* upup-catch: no upload endpoint configured; only the pipeline's checksum step is under test here */ }
    const processed = [...core.files.values()][0]
    expect(processed.checksumSHA256).toBeDefined()
    expect(processed.checksumSHA256!.length).toBe(64)
    core.destroy()
  })

  it('runs the pipeline on the main thread when workers are unavailable (default auto)', async () => {
    const core = new UpupCore({ checksumVerification: true })
    await core.setFiles([new File(['data'], 'b.txt', { type: 'text/plain' })])
    try { await core.upload() } catch { /* upup-catch: no upload endpoint configured; only the pipeline's checksum step is under test here */ }
    expect([...core.files.values()][0].checksumSHA256).toBeDefined()
    core.destroy()
  })

  it('exposes webWorker on CoreOptions type', () => {
    const core = new UpupCore({ webWorker: true })
    expect(core.options.webWorker).toBe(true)
    core.destroy()
  })
})

describe('workerTimeoutMs wiring', () => {
  const realWorker = globalThis.Worker

  class FakeWorker {
    onmessage: ((e: unknown) => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    postMessage() {}
    terminate() {}
  }

  beforeEach(() => {
    // isWorkerEligible() gates on typeof Worker !== 'undefined'
    ;(globalThis as unknown as { Worker: unknown }).Worker = FakeWorker
  })

  afterEach(() => {
    ;(globalThis as unknown as { Worker: unknown }).Worker = realWorker
    vi.restoreAllMocks()
  })

  it('threads workerTimeoutMs into createWorkerProvider', async () => {
    const spy = vi
      .spyOn(createWorkerProviderModule, 'createWorkerProvider')
      .mockReturnValue({
        execute: async () => ({ kind: 'hash', checksum: 'stub' }),
        terminate: () => {},
      })

    const core = new UpupCore({
      checksumVerification: true,
      webWorker: true,
      workerTimeoutMs: 60000,
    })
    await core.setFiles([new File(['data'], 'c.txt', { type: 'text/plain' })])
    try { await core.upload() } catch { /* upup-catch: no upload endpoint configured; only the pipeline's checksum step is under test here */ }

    expect(spy).toHaveBeenCalledWith(expect.anything(), { timeoutMs: 60000 })
    core.destroy()
  })
})
