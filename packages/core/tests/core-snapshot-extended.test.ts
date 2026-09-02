import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@useupup/core'
import type { UploadFile } from '@useupup/core'

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('UpupCore — snapshot extended', () => {
    it('getSnapshot captures current files and status', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        core.resume()

        const snap = core.getSnapshot()
        expect(snap.files).toHaveLength(2)
        expect(snap.status).toBe(UploadStatus.UPLOADING)
        core.destroy()
    })

    it('getSnapshot returns empty when no files', () => {
        const core = new UpupCore({})
        const snap = core.getSnapshot()
        expect(snap.files).toHaveLength(0)
        expect(snap.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('snapshot is a copy — modifying it does not affect core', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt')])
        const snap = core.getSnapshot()
        snap.files.push(['fake', {} as unknown as UploadFile])
        expect(core.files.size).toBe(1) // core unaffected
        core.destroy()
    })

    it('restore then getSnapshot round-trips consistently', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('x.txt'), makeFile('y.txt')])
        core.pause()
        const snap1 = core.getSnapshot()

        const core2 = new UpupCore({})
        core2.restore(snap1)
        const snap2 = core2.getSnapshot()

        expect(snap2.files).toHaveLength(snap1.files.length)
        expect(snap2.status).toBe(UploadStatus.PAUSED)
        core.destroy()
        core2.destroy()
    })

    it('restore overwrites previous state completely', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('old.txt')])
        core.pause()

        const newSnap = {
            files: [] as [string, UploadFile][],
            status: UploadStatus.IDLE,
        }
        core.restore(newSnap)

        expect(core.files.size).toBe(0)
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('multiple snapshot/restore cycles preserve data', async () => {
        const core = new UpupCore({})

        await core.addFiles([makeFile('v1.txt')])
        const snap1 = core.getSnapshot()

        await core.addFiles([makeFile('v2.txt')])
        const snap2 = core.getSnapshot()

        // Restore to v1
        core.restore(snap1)
        expect(core.files.size).toBe(1)

        // Restore to v2
        core.restore(snap2)
        expect(core.files.size).toBe(2)

        core.destroy()
    })

    it('snapshot-restored event fires with correct payload', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('snapshot-restored', handler)

        const snap = {
            files: [['f1', { id: 'f1', name: 'test.txt' }]] as unknown as [
                string,
                UploadFile,
            ][],
            status: UploadStatus.PAUSED,
        }
        core.restore(snap)

        expect(handler).toHaveBeenCalledWith({
            count: 1,
            status: UploadStatus.PAUSED,
        })
        core.destroy()
    })
})
