import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UploadStatus } from '../src/types/upload-status'

/**
 * P6 — the core state/event contract (§0). Cross-cutting pins that encode the
 * contract each checkpoint aligns the code to. Grouped by owned finding.
 */

const realFile = (name: string, bytes = 4): File =>
  new File([new Uint8Array(bytes)], name, { type: 'text/plain' })

/** A core whose upload target always fails deterministically (presign fetch rejects). */
const makeFailingCore = () =>
  new UpupCore({ provider: 'aws', uploadEndpoint: '/api/presign', maxRetries: 0 })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─────────────────────────────────────────────────────────────
// C1 / F-146 — ONE upload-failure channel: upload-error
// ─────────────────────────────────────────────────────────────
describe('P6 contract — one upload-failure channel (F-146)', () => {
  it('resume() failure routes through upload-error, never the retired error event', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('presign down') }))

    const core = makeFailingCore()
    await core.addFiles([realFile('a.txt')]) // key == null → resume will attempt it

    const errorSpy = vi.fn()
    core.on('error', errorSpy) // the retired channel — must NEVER fire

    // Wait for the whole resume flow to settle (core reaches FAILED), so we observe
    // the resume-level failure emission — not just the earlier per-file upload-error.
    const settled = new Promise<void>(resolve => {
      core.on('state-change', (payload: { status?: UploadStatus }) => {
        if (payload.status === UploadStatus.FAILED) resolve()
      })
    })
    const uploadErrorSeen = vi.fn()
    core.on('upload-error', uploadErrorSeen)

    core.resume()
    await settled

    // The resume-level failure (aggregate "N file upload(s) failed") must land on
    // upload-error, and the retired bare 'error' event must never fire at all.
    expect(uploadErrorSeen).toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    core.destroy()
  })

  it('a failed resume reaches the orchestrator UI: FAILED + non-empty uploadError (stuck-UI repro)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('presign down') }))

    const core = makeFailingCore()
    const orch = new UploaderOrchestrator(core, {})
    orch.init()
    await core.addFiles([realFile('a.txt')])

    const reachedFailed = new Promise<void>(resolve => {
      const unsub = orch.subscribe(() => {
        if (orch.getSnapshot().uploadStatus === UploadStatus.FAILED) {
          unsub()
          resolve()
        }
      })
    })

    core.resume()
    await reachedFailed

    expect(orch.getSnapshot().uploadStatus).toBe(UploadStatus.FAILED)
    expect(orch.getSnapshot().uploadError).not.toBe('')
    orch.destroy()
    core.destroy()
  })
})

// ─────────────────────────────────────────────────────────────
// C2 / F-147 — a consumer's listener throwing is NOT an upload failure
// ─────────────────────────────────────────────────────────────
describe('P6 contract — listener isolation (F-147)', () => {
  it('a throwing state-change handler does not abort later handlers nor throw out of emit', () => {
    const core = new UpupCore({})
    const second = vi.fn()
    core.on('state-change', () => { throw new Error('render bug') })
    core.on('state-change', second)

    // Drive a state mutation that emits state-change (pause emits {status: PAUSED}).
    expect(() => core.pause()).not.toThrow()
    expect(second).toHaveBeenCalled()
    core.destroy()
  })

  it('a render-bug listener throw does not corrupt upload status (no-op local flow stays SUCCESSFUL)', async () => {
    // Target configured, zero files → upload() runs the empty no-op flow to SUCCESSFUL
    // without any network call. A throwing state-change listener must not derail it.
    const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/presign' })
    core.on('state-change', () => { throw new Error('render bug in a listener') })

    await expect(core.upload()).resolves.toBeDefined()
    expect(core.status).toBe(UploadStatus.SUCCESSFUL)
    core.destroy()
  })
})
