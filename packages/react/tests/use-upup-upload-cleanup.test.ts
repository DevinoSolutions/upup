import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/shared'

const opts = { provider: 'S3' as const }
const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('useUpupUpload — cleanup on unmount', () => {
    it('unmount does not throw', async () => {
        const { result, unmount } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt')])
        })
        expect(() => unmount()).not.toThrow()
    })

    it('core is destroyed after unmount', async () => {
        const { result, unmount } = renderHook(() => useUpupUpload(opts))
        const core = result.current.core
        await act(async () => {
            await result.current.addFiles([makeFile('b.txt')])
        })
        unmount()
        // After destroy, core files should be empty
        expect(core.files.size).toBe(0)
    })

    it('event listeners do not fire after unmount', async () => {
        const handler = vi.fn()
        const { result, unmount } = renderHook(() => useUpupUpload(opts))
        const core = result.current.core
        act(() => { result.current.on('files-added', handler) })

        await act(async () => {
            await result.current.addFiles([makeFile('c.txt')])
        })
        expect(handler).toHaveBeenCalledTimes(1)

        unmount()
        // Emit after unmount — handler should not fire (listeners cleared)
        core.emit('files-added', [])
        expect(handler).toHaveBeenCalledTimes(1) // no new call
    })

    it('re-mounting creates a fresh instance', async () => {
        const { result: r1, unmount: u1 } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await r1.current.addFiles([makeFile('old.txt')])
        })
        expect(r1.current.files.length).toBe(1)
        u1()

        const { result: r2 } = renderHook(() => useUpupUpload(opts))
        expect(r2.current.files.length).toBe(0) // fresh instance
        expect(r2.current.core).not.toBe(r1.current.core) // different core
    })

    it('status resets after unmount', () => {
        const { result, unmount } = renderHook(() => useUpupUpload(opts))
        const core = result.current.core
        act(() => { core.pause() })
        unmount()
        expect(core.status).toBe(UploadStatus.IDLE) // destroy resets
    })

    it('extensions are cleared after unmount', () => {
        const { result, unmount } = renderHook(() =>
            useUpupUpload({
                ...opts,
                plugins: [{
                    name: 'cleanup-ext',
                    setup: (c) => {
                        (c as any).pluginManager.registerExtension('tmp', { v: 1 })
                    },
                }],
            }),
        )
        const core = result.current.core
        expect(core.getExtension('tmp')).toBeDefined()
        unmount()
        expect(core.getExtension('tmp')).toBeUndefined()
    })
})
