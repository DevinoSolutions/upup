// Contract (`networkAware`, default on): going offline mid-upload PAUSES the
// run — with multipart persist that keeps the server-side session alive
// instead of burning whole-run retries against a dead network — and coming
// back online RESUMES it. The one rule that must never break: `online` only
// resumes a pause the OFFLINE HANDLER made. A pause the user chose is the
// user's, and connectivity flapping must not overrule it.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@useupup/core'
import type { PipelineStep, UploadFile } from '@useupup/core'

/** Minimal window stand-in: an EventTarget with addEventListener semantics —
 *  test infrastructure bridging the browser API onto vitest's node env. */
function makeWindowStub() {
    const listeners = new Map<string, Set<() => void>>()
    return {
        addEventListener: vi.fn((type: string, fn: () => void) => {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type)!.add(fn)
        }),
        removeEventListener: vi.fn((type: string, fn: () => void) => {
            listeners.get(type)?.delete(fn)
        }),
        fire(type: 'online' | 'offline') {
            for (const fn of listeners.get(type) ?? []) fn()
        },
        count(type: string): number {
            return listeners.get(type)?.size ?? 0
        },
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
})

type ActiveCoreHarness = {
    core: UpupCore
    /** What a browser does to in-flight requests when the network drops:
     *  rejects them with a network TypeError. The presign fetch carries no
     *  abort signal, so this settle is what frees the activeRun guard for
     *  the deferred online-resume — parked-forever promises would model a
     *  network that can never fail, which no real network is. */
    failInflightFetches: () => void
}

function makeActiveCore(
    win: ReturnType<typeof makeWindowStub>,
): ActiveCoreHarness {
    vi.stubGlobal('window', win)
    const inflight: Array<(reason: unknown) => void> = []
    // Park every transfer request: these tests observe state transitions,
    // not transfer outcomes. Requests settle only via failInflightFetches
    // (network drop) or the abort signal (pause/destroy), as in a browser.
    vi.stubGlobal(
        'fetch',
        vi.fn(
            (_url: string, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    inflight.push(reject)
                    init?.signal?.addEventListener(
                        'abort',
                        () => reject(new DOMException('Aborted', 'AbortError')),
                        { once: true },
                    )
                }),
        ),
    )
    const core = new UpupCore({
        provider: 'aws',
        uploadEndpoint: '/api/presign',
        maxRetries: 0,
    })
    return {
        core,
        failInflightFetches: () => {
            for (const reject of inflight.splice(0)) {
                reject(new TypeError('Failed to fetch'))
            }
        },
    }
}

type GatedPipelineHarness = {
    core: UpupCore
    /** Releases the parked pipeline step, letting runUpload advance out of the
     *  PROCESSING phase toward (or, when held, past) the transfer. */
    releasePipeline: () => void
    /** The transfer's presign call. It is never invoked until a transfer
     *  actually starts — so "not called" is the proof no upload ran. */
    fetchMock: ReturnType<typeof vi.fn>
}

/** A core whose single pipeline step parks until released, so a test can pin
 *  the run in the PROCESSING phase (where uploadManager does not yet exist)
 *  and act — going offline, pausing — before any transfer can begin. */
function makeGatedPipelineCore(
    win: ReturnType<typeof makeWindowStub>,
): GatedPipelineHarness {
    vi.stubGlobal('window', win)
    const fetchMock = vi.fn(
        (_url: string, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener(
                    'abort',
                    () => reject(new DOMException('Aborted', 'AbortError')),
                    { once: true },
                )
            }),
    )
    vi.stubGlobal('fetch', fetchMock)

    let releasePipeline!: () => void
    const gate = new Promise<void>(resolve => {
        releasePipeline = resolve
    })
    const gateStep: PipelineStep = {
        name: 'test-gate',
        process: async (file: UploadFile) => {
            await gate
            return file
        },
    }
    const core = new UpupCore({
        provider: 'aws',
        uploadEndpoint: '/api/presign',
        maxRetries: 0,
        pipeline: [gateStep],
    })
    return { core, releasePipeline, fetchMock }
}

async function startUpload(core: UpupCore): Promise<void> {
    await core.addFiles([new File(['x'.repeat(64)], 'net.txt')])
    void core.upload().catch(() => {
        // The run settles only via failInflightFetches or an abort on
        // pause/destroy — either rejection is expected noise here.
    })
    await vi.waitFor(() => {
        expect(core.status).toBe(UploadStatus.UPLOADING)
    })
}

describe('networkAware pause/resume', () => {
    it('offline mid-upload pauses the run; online resumes it', async () => {
        const win = makeWindowStub()
        const { core, failInflightFetches } = makeActiveCore(win)
        await startUpload(core)

        win.fire('offline')
        failInflightFetches()
        expect(core.status).toBe(UploadStatus.PAUSED)

        win.fire('online')
        // The resume is deferred a tick so the aborted run can settle first.
        await vi.waitFor(() => {
            expect(core.status).toBe(UploadStatus.UPLOADING)
        })
        core.destroy()
    })

    it('online never overrules a pause the user chose', async () => {
        const win = makeWindowStub()
        const { core } = makeActiveCore(win)
        await startUpload(core)

        core.pause() // the USER paused — connectivity is irrelevant
        win.fire('online')
        // Wait past the deferred-resume window before declaring victory.
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('a user pause AFTER an offline pause takes ownership — the next online stays hands-off', async () => {
        const win = makeWindowStub()
        const { core, failInflightFetches } = makeActiveCore(win)
        await startUpload(core)

        win.fire('offline')
        failInflightFetches()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.pause() // user reaffirms the pause while offline
        win.fire('online')
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('offline while idle does nothing — there is no run to pause', () => {
        const win = makeWindowStub()
        const { core } = makeActiveCore(win)

        win.fire('offline')
        expect(core.status).toBe(UploadStatus.IDLE)
        win.fire('online')
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('networkAware: false installs no listeners at all', () => {
        const win = makeWindowStub()
        vi.stubGlobal('window', win)
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/presign',
            networkAware: false,
        })
        expect(win.count('offline')).toBe(0)
        expect(win.count('online')).toBe(0)
        core.destroy()
    })

    it('destroy() detaches both listeners — no dangling handler outlives the core', async () => {
        const win = makeWindowStub()
        const { core } = makeActiveCore(win)
        expect(win.count('offline')).toBe(1)
        expect(win.count('online')).toBe(1)

        core.destroy()
        expect(win.count('offline')).toBe(0)
        expect(win.count('online')).toBe(0)
        // Firing after destroy must be inert, not a throw on a dead core.
        win.fire('offline')
        win.fire('online')
    })

    it('going offline during the PROCESSING phase holds the run paused and never starts a transfer over the dead network', async () => {
        const win = makeWindowStub()
        const { core, releasePipeline, fetchMock } = makeGatedPipelineCore(win)
        await core.addFiles([new File(['x'.repeat(64)], 'proc.txt')])

        const run = core.upload().catch(() => {
            // The run settles by being held paused; nothing here throws.
        })
        // The gated pipeline step parks the run in PROCESSING, before an
        // uploadManager exists to abort.
        await vi.waitFor(() => {
            expect(core.status).toBe(UploadStatus.PROCESSING)
        })

        win.fire('offline')
        expect(core.status).toBe(UploadStatus.PAUSED)

        // Let the pipeline finish. Without the guard runUpload would flip to
        // UPLOADING here and hit the wire; the guard must hold it PAUSED.
        releasePipeline()
        await run
        expect(core.status).toBe(UploadStatus.PAUSED)
        expect(fetchMock).not.toHaveBeenCalled()
        core.destroy()
    })

    it('a run paused during PROCESSING is resumed by a later online — the deferred transfer finally reaches the wire', async () => {
        const win = makeWindowStub()
        const { core, releasePipeline, fetchMock } = makeGatedPipelineCore(win)
        await core.addFiles([new File(['x'.repeat(64)], 'proc.txt')])

        const run = core.upload().catch(() => {
            // Held-paused run; the later resume is what reaches the wire.
        })
        await vi.waitFor(() => {
            expect(core.status).toBe(UploadStatus.PROCESSING)
        })

        win.fire('offline')
        releasePipeline()
        await run
        expect(core.status).toBe(UploadStatus.PAUSED)
        expect(fetchMock).not.toHaveBeenCalled()

        win.fire('online')
        // Deferred a tick, then the held transfer starts for real.
        await vi.waitFor(() => {
            expect(core.status).toBe(UploadStatus.UPLOADING)
        })
        expect(fetchMock).toHaveBeenCalled()
        core.destroy()
    })

    it('cancel() clears the offline-pause ownership so a later online cannot resurrect the cancelled upload', async () => {
        const win = makeWindowStub()
        const { core, failInflightFetches } = makeActiveCore(win)
        await startUpload(core)

        win.fire('offline')
        failInflightFetches()
        expect(core.status).toBe(UploadStatus.PAUSED)

        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)

        // A crash-restore later lands the core back in PAUSED. Because cancel
        // released the offline-pause flag, online must treat this as a pause it
        // never owned and leave it alone — not auto-resume a killed upload.
        core.restore({
            files: [...core.getSnapshot().files],
            status: UploadStatus.PAUSED,
        })
        win.fire('online')
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('constructing without a window (SSR/node) is safe and installs nothing', () => {
        vi.stubGlobal('window', undefined)
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/presign',
        })
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })
})
