import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

function makeUploadFile(id: string): UploadFile {
    return Object.assign(new File(['x'], `${id}.txt`, { type: 'text/plain' }), {
        id,
        url: null,
        relativePath: null,
        key: null,
        fileHash: null,
        checksumSHA256: null,
        etag: null,
        thumbnail: null,
    }) as unknown as UploadFile
}

// ─────────────────────────────────────────────
// restore() + snapshot-restored event
// ─────────────────────────────────────────────
describe('UpupCore — restore() and snapshot-restored event', () => {
    it('emits snapshot-restored with file count and status', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('snapshot-restored', handler)

        const snapshot = {
            files: [['f1', makeUploadFile('f1')], ['f2', makeUploadFile('f2')]] as [string, UploadFile][],
            status: UploadStatus.SUCCESSFUL,
        }
        core.restore(snapshot)

        expect(handler).toHaveBeenCalledWith({
            count: 2,
            status: UploadStatus.SUCCESSFUL,
        })
    })

    it('also emits state-change when restoring', () => {
        const core = makeCore()
        const stateHandler = vi.fn()
        core.on('state-change', stateHandler)

        core.restore({ files: [], status: UploadStatus.IDLE })

        expect(stateHandler).toHaveBeenCalled()
    })

    it('restores files into the core map', () => {
        const core = makeCore()
        const file = makeUploadFile('restored')
        core.restore({ files: [['restored', file]], status: UploadStatus.IDLE })

        expect(core.files.size).toBe(1)
        expect(core.files.has('restored')).toBe(true)
    })

    it('restores status into core.status', () => {
        const core = makeCore()
        core.restore({ files: [], status: UploadStatus.FAILED })
        expect(core.status).toBe(UploadStatus.FAILED)
    })

    it('clears existing files before restoring', async () => {
        const core = makeCore()
        await core.addFiles([new File(['x'], 'old.txt', { type: 'text/plain' })])
        expect(core.files.size).toBe(1)

        core.restore({ files: [], status: UploadStatus.IDLE })
        expect(core.files.size).toBe(0)
    })

    it('emits snapshot-restored with count 0 for empty snapshot', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('snapshot-restored', handler)

        core.restore({ files: [], status: UploadStatus.IDLE })

        expect(handler).toHaveBeenCalledWith({
            count: 0,
            status: UploadStatus.IDLE,
        })
    })

    it('getSnapshot returns the restored state', () => {
        const core = makeCore()
        const file = makeUploadFile('snap')
        core.restore({ files: [['snap', file]], status: UploadStatus.SUCCESSFUL })

        const snapshot = core.getSnapshot()
        expect(snapshot.files).toHaveLength(1)
        expect(snapshot.files[0][0]).toBe('snap')
        expect(snapshot.status).toBe(UploadStatus.SUCCESSFUL)
    })
})
