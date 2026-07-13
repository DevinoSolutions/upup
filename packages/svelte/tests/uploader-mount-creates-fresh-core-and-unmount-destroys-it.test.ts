import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/svelte'
import { UploadStatus } from '@useupup/core'
import { withSetup } from './helpers'

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

afterEach(() => cleanup())

// P6 core-state/event contract (CLAUDE.md): "frameworks create a FRESH core
// per mount and destroy() it on unmount... After it, upload/resume/retry/
// addFiles/setFiles throw... fileManager is kept so the files/progress
// getters keep working." This pins that contract for @useupup/svelte's
// useUpupUpload — the same seam react's use-upup-upload-cleanup.test.ts
// covers for @useupup/react.
describe('useUpupUpload — fresh core per mount, destroy() on unmount (P6)', () => {
    it('mount creates a live, usable core', async () => {
        const { result, unmount } = withSetup({ limit: 5 })
        expect(result.core).toBeDefined()
        expect(result.core.status).toBe(UploadStatus.IDLE)
        await result.addFiles([makeFile('a.txt')])
        expect(result.core.files.size).toBe(1)
        unmount()
    })

    it('unmount calls core.destroy() exactly once', () => {
        const { result, unmount } = withSetup({ limit: 5 })
        const destroySpy = vi.spyOn(result.core, 'destroy')
        unmount()
        expect(destroySpy).toHaveBeenCalledTimes(1)
    })

    it('destroy() is terminal: addFiles/setFiles/upload/retry reject and resume throws', async () => {
        const { result, unmount } = withSetup({ limit: 5 })
        const core = result.core
        unmount()
        await expect(core.addFiles([makeFile('late.txt')])).rejects.toThrow()
        await expect(core.setFiles([makeFile('late2.txt')])).rejects.toThrow()
        await expect(core.upload()).rejects.toThrow()
        await expect(core.retry()).rejects.toThrow()
        expect(() => core.resume()).toThrow()
    })

    it('destroy() clears files but keeps the files/status getters readable', async () => {
        const { result, unmount } = withSetup({ limit: 5 })
        await result.addFiles([makeFile('b.txt')])
        expect(result.core.files.size).toBe(1)
        unmount()
        expect(result.core.files.size).toBe(0)
        expect(result.core.status).toBe(UploadStatus.IDLE)
    })

    it('destroy() clears listeners: events no longer fire on the destroyed core', async () => {
        const handler = vi.fn()
        const { result, unmount } = withSetup({ limit: 5 })
        const core = result.core
        core.on('files-added', handler)
        await result.addFiles([makeFile('c.txt')])
        expect(handler).toHaveBeenCalledTimes(1)
        unmount()
        core.emit('files-added', [])
        expect(handler).toHaveBeenCalledTimes(1) // no new call after destroy
    })

    it('remounting after unmount creates an independent core with fresh state', async () => {
        const { result: r1, unmount: u1 } = withSetup({ limit: 5 })
        await r1.addFiles([makeFile('old.txt')])
        expect(r1.core.files.size).toBe(1)
        u1()

        const { result: r2, unmount: u2 } = withSetup({ limit: 5 })
        expect(r2.core).not.toBe(r1.core)
        expect(r2.core.files.size).toBe(0)
        expect(r2.core.status).toBe(UploadStatus.IDLE)
        u2()
    })

    it('destroying one instance does not affect a second, still-mounted instance', async () => {
        const { result: r1, unmount: u1 } = withSetup({ limit: 5 })
        const { result: r2, unmount: u2 } = withSetup({ limit: 5 })
        expect(r2.core).not.toBe(r1.core)
        u1()
        await expect(
            r2.addFiles([makeFile('still-alive.txt')]),
        ).resolves.toBeUndefined()
        expect(r2.core.files.size).toBe(1)
        u2()
    })
})
