import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

// ─────────────────────────────────────────────
// pause
// ─────────────────────────────────────────────
describe('UpupCore — pause()', () => {
    it('sets status to PAUSED', () => {
        const core = makeCore()
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
    })

    it('emits upload-pause event', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('upload-pause', handler)
        core.pause()
        expect(handler).toHaveBeenCalledWith({})
    })

    it('emits state-change event', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('state-change', handler)
        core.pause()
        expect(handler).toHaveBeenCalledWith({ status: UploadStatus.PAUSED })
    })

    it('can be called without an active upload manager', () => {
        const core = makeCore()
        expect(() => core.pause()).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// resume
// ─────────────────────────────────────────────
describe('UpupCore — resume()', () => {
    it('sets status to UPLOADING', () => {
        const core = makeCore()
        core.resume()
        expect(core.status).toBe(UploadStatus.UPLOADING)
    })

    it('emits upload-resume event', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('upload-resume', handler)
        core.resume()
        expect(handler).toHaveBeenCalledWith({})
    })

    it('emits state-change event', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('state-change', handler)
        core.resume()
        expect(handler).toHaveBeenCalledWith({ status: UploadStatus.UPLOADING })
    })

    it('can be called without an active upload manager', () => {
        const core = makeCore()
        expect(() => core.resume()).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// cancel
// ─────────────────────────────────────────────
describe('UpupCore — cancel()', () => {
    it('sets status to IDLE', () => {
        const core = makeCore()
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
    })

    it('emits upload-cancel event', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('upload-cancel', handler)
        core.cancel()
        expect(handler).toHaveBeenCalledWith({})
    })

    it('emits state-change event', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('state-change', handler)
        core.cancel()
        expect(handler).toHaveBeenCalledWith({ status: UploadStatus.IDLE })
    })

    it('can be called without an active upload manager', () => {
        const core = makeCore()
        expect(() => core.cancel()).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// retry
// ─────────────────────────────────────────────
describe('UpupCore — retry()', () => {
    it('emits retry event with no fileId', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('retry', handler)
        core.retry()
        expect(handler).toHaveBeenCalledWith({ fileId: undefined })
    })

    it('emits retry event with specific fileId', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('retry', handler)
        core.retry('file-123')
        expect(handler).toHaveBeenCalledWith({ fileId: 'file-123' })
    })

    it('does not change status', () => {
        const core = makeCore()
        const before = core.status
        core.retry()
        expect(core.status).toBe(before)
    })
})

// ─────────────────────────────────────────────
// pause → resume → cancel sequencing
// ─────────────────────────────────────────────
describe('UpupCore — upload control sequencing', () => {
    it('pause then resume transitions PAUSED → UPLOADING', () => {
        const core = makeCore()
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.resume()
        expect(core.status).toBe(UploadStatus.UPLOADING)
    })

    it('pause then cancel transitions PAUSED → IDLE', () => {
        const core = makeCore()
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
    })

    it('emits events in correct order for pause → resume', () => {
        const core = makeCore()
        const events: string[] = []
        core.on('upload-pause', () => events.push('pause'))
        core.on('upload-resume', () => events.push('resume'))
        core.pause()
        core.resume()
        expect(events).toEqual(['pause', 'resume'])
    })
})

// ─────────────────────────────────────────────
// re-entrancy: one upload run at a time (F-149)
// ─────────────────────────────────────────────
describe('UpupCore — upload run re-entrancy (F-149)', () => {
    const hangingFetchCore = async () => {
        // presign never resolves → the run stays in flight for the duration of the test
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/presign', maxRetries: 0 })
        await core.addFiles([new File(['x'], 'a.txt', { type: 'text/plain' })])
        return core
    }

    it('a second upload() while a run is in flight joins the same run (no second run started)', async () => {
        const core = await hangingFetchCore()
        // runUpload() emits upload-start at its head; a second run would emit it again.
        const startSpy = vi.fn()
        core.on('upload-start', startSpy)
        const p1 = core.upload()
        const p2 = core.upload()
        // Both callers observe one run; the second call did not kick off a second runUpload.
        expect(startSpy).toHaveBeenCalledTimes(1)
        core.destroy()
        vi.unstubAllGlobals()
        await Promise.allSettled([p1, p2])
    })

    it('resume() while a run is in flight is a no-op (does not start a second run)', async () => {
        const core = await hangingFetchCore()
        const p1 = core.upload()
        const resumeSpy = vi.fn()
        core.on('upload-resume', resumeSpy)
        core.resume() // must not kick off a competing run
        expect(resumeSpy).not.toHaveBeenCalled()
        core.destroy()
        vi.unstubAllGlobals()
        await Promise.allSettled([p1])
    })
})
