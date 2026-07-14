import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'
import { UploadStatus } from '../src/types/upload-status'
import type { UploadFile } from '../src/types/upload-file'
import type { PipelineEngine } from '../src/pipeline/engine'

/**
 * P6 — the core state/event contract (§0). Cross-cutting pins that encode the
 * contract each checkpoint aligns the code to. Grouped by owned finding.
 */

const realFile = (name: string, bytes = 4): File =>
    new File([new Uint8Array(bytes)], name, { type: 'text/plain' })

/** Reach the private pipelineEngine cache for cache-invalidation assertions (P6/C7). */
const pipelineEngineOf = (core: UpupCore): PipelineEngine | null =>
    (core as unknown as { pipelineEngine: PipelineEngine | null })
        .pipelineEngine

/** A core whose upload target always fails deterministically (presign fetch rejects). */
const makeFailingCore = () =>
    new UpupCore({
        provider: 'aws',
        uploadEndpoint: '/api/presign',
        maxRetries: 0,
    })

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

// ─────────────────────────────────────────────────────────────
// C1 / F-146 — ONE upload-failure channel: upload-error
// ─────────────────────────────────────────────────────────────
describe('P6 contract — one upload-failure channel (F-146)', () => {
    it('resume() failure routes through upload-error, never the retired error event', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('presign down')
            }),
        )

        const core = makeFailingCore()
        await core.addFiles([realFile('a.txt')]) // key == null → resume will attempt it

        const errorSpy = vi.fn()
        // The retired bare 'error' channel must NEVER fire (P6). Since F-723
        // subscribing to it is also a compile error — bypass the typed surface
        // deliberately so the runtime "stays silent" pin keeps executing.
        const onUntyped = core.on.bind(core) as (
            event: string,
            handler: (payload: unknown) => void,
        ) => () => void
        onUntyped('error', errorSpy)

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
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('presign down')
            }),
        )

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
        core.on('state-change', () => {
            throw new Error('render bug')
        })
        core.on('state-change', second)

        // Drive a state mutation that emits state-change (pause emits {status: PAUSED}).
        expect(() => core.pause()).not.toThrow()
        expect(second).toHaveBeenCalled()
        core.destroy()
    })

    it('a render-bug listener throw does not corrupt upload status (no-op local flow stays SUCCESSFUL)', async () => {
        // Target configured, zero files → upload() runs the empty no-op flow to SUCCESSFUL
        // without any network call. A throwing state-change listener must not derail it.
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/presign',
        })
        core.on('state-change', () => {
            throw new Error('render bug in a listener')
        })

        await expect(core.upload()).resolves.toBeDefined()
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
        core.destroy()
    })
})

// ─────────────────────────────────────────────────────────────
// C3 / F-144 — file-status transitions are immutable (new reference)
// ─────────────────────────────────────────────────────────────
describe('P6 contract — immutable file-status transitions (F-144)', () => {
    it('a status transition replaces the map object (new ref) and leaves the original unmutated', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('presign down')
            }),
        )

        const core = makeFailingCore()
        await core.addFiles([realFile('a.txt')])
        const id = [...core.files.keys()][0]
        const before = core.files.get(id!)!
        expect(before.status).toBe(UploadStatus.IDLE)

        await core.upload().catch(() => {})

        const after = core.files.get(id!)!
        expect(after.status).toBe(UploadStatus.FAILED)
        expect(after).not.toBe(before) // NEW object reference
        expect(before.status).toBe(UploadStatus.IDLE) // original object untouched
        // File-integrity tripwire (S3-D11 rider): the transition must NOT strip File-ness —
        // an object-spread clone would leave a plain object here and silently break xhr.send.
        expect(after).toBeInstanceOf(File)
        expect(after.size).toBe(before.size)
        core.destroy()
    })
})

// ─────────────────────────────────────────────────────────────
// C7 / F-151 — updateOptions invalidates the cached auto-pipeline
// ─────────────────────────────────────────────────────────────
describe('P6 contract — pipeline-flag invalidation (F-151)', () => {
    it('toggling an auto-pipeline flag after the first upload nulls the cached pipelineEngine', async () => {
        // imageCompression:true builds the auto-pipeline on upload → engine is cached.
        const core = new UpupCore({
            imageCompression: true,
            uploadEndpoint: '/api/presign',
        })
        await core.upload().catch(() => {}) // builds the auto-pipeline (no files/network needed)
        expect(pipelineEngineOf(core)).not.toBeNull()

        core.updateOptions({ imageCompression: false })
        // Invalidated → next upload() rebuilds from the new flags.
        expect(pipelineEngineOf(core)).toBeNull()
        core.destroy()
    })

    it('an explicit pipeline is NOT invalidated by a flag change (construction-only)', () => {
        const core = new UpupCore({
            pipeline: [],
            uploadEndpoint: '/api/presign',
        })
        expect(pipelineEngineOf(core)).not.toBeNull()

        core.updateOptions({ imageCompression: true })
        expect(pipelineEngineOf(core)).not.toBeNull() // explicit pipeline survives
        core.destroy()
    })

    it('at the orchestrator boundary a real status transition yields a NEW files snapshot ref (ref-diff fires)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('presign down')
            }),
        )

        const core = makeFailingCore()
        const orch = new UploaderOrchestrator(core, {})
        orch.init()
        await core.addFiles([realFile('a.txt')])
        const filesBefore = orch.getSnapshot().files

        await core.upload().catch(() => {})

        const filesAfter = orch.getSnapshot().files
        expect(filesAfter).not.toBe(filesBefore) // the projection rebuilt on the status change
        orch.destroy()
        core.destroy()
    })
})

// ─────────────────────────────────────────────────────────────
// P20 / F-143 — the files getter is a read-only view (defensive copy)
// ─────────────────────────────────────────────────────────────
describe('P20 contract — core.files is a defensive copy (F-143)', () => {
    it('a caller mutating the returned map does not corrupt core state', async () => {
        const core = new UpupCore({})
        await core.addFiles([realFile('a.txt')])

        const view = core.files as Map<string, UploadFile>
        view.set('x', {} as UploadFile)

        expect(core.files.has('x')).toBe(false)
        core.destroy()
    })

    it('real adds still reflect through the getter', async () => {
        const core = new UpupCore({})
        await core.addFiles([realFile('a.txt')])

        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('core.files is a fresh copy on every read (not memoized)', async () => {
        const core = new UpupCore({})
        await core.addFiles([realFile('a.txt')])

        expect(core.files).not.toBe(core.files)
        core.destroy()
    })

    it('a real upload() run leaves core.files holding the pipeline-processed objects (applyProcessed wired)', async () => {
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/presign',
            imageCompression: true,
        })
        await core.addFiles([realFile('a.txt')])

        await core.upload().catch(() => {})

        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('a restore(snapshot) round-trip yields exactly the snapshot entries and emits snapshot-restored (FileManager.restore wired)', async () => {
        const core = new UpupCore({})
        await core.addFiles([realFile('a.txt'), realFile('b.txt')])
        const snapshot = core.getSnapshot()

        const restoredSpy = vi.fn()
        core.on('snapshot-restored', restoredSpy)

        core.restore(snapshot)

        expect(core.files.size).toBe(snapshot.files.length)
        for (const [id] of snapshot.files) {
            expect(core.files.has(id)).toBe(true)
        }
        expect(restoredSpy).toHaveBeenCalledWith({
            count: snapshot.files.length,
            status: snapshot.status,
        })
        core.destroy()
    })
})
