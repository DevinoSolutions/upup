import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

const opts = { provider: 'S3' as const }
const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('useUpupUpload — event callbacks', () => {
    it('onFileAdded fires when a file is added', async () => {
        const onFileAdded = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, onFileAdded }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt')])
        })
        expect(onFileAdded).toHaveBeenCalled()
    })

    it('onFileRemoved fires when a file is removed', async () => {
        const onFileRemoved = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, onFileRemoved }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('r.txt')])
        })
        const id = result.current.files[0]!.id
        act(() => {
            result.current.removeFile(id)
        })
        expect(onFileRemoved).toHaveBeenCalled()
    })
})

describe('useUpupUpload — on() event subscription', () => {
    it('subscribes to files-added event', async () => {
        const handler = vi.fn()
        const { result } = renderHook(() => useUpupUpload(opts))
        act(() => {
            result.current.on('files-added', handler)
        })

        await act(async () => {
            await result.current.addFiles([makeFile('evt.txt')])
        })
        expect(handler).toHaveBeenCalled()
    })

    it('subscribes to file-removed event', async () => {
        const handler = vi.fn()
        const { result } = renderHook(() => useUpupUpload(opts))
        act(() => {
            result.current.on('file-removed', handler)
        })

        await act(async () => {
            await result.current.addFiles([makeFile('rm.txt')])
        })
        const id = result.current.files[0]!.id
        act(() => {
            result.current.removeFile(id)
        })
        expect(handler).toHaveBeenCalled()
    })

    it('unsubscribe stops receiving events', async () => {
        const handler = vi.fn()
        const { result } = renderHook(() => useUpupUpload(opts))
        let unsub: () => void
        act(() => {
            unsub = result.current.on('files-added', handler)
        })

        await act(async () => {
            await result.current.addFiles([makeFile('first.txt')])
        })
        expect(handler).toHaveBeenCalledTimes(1)

        act(() => {
            unsub()
        })
        await act(async () => {
            await result.current.addFiles([makeFile('second.txt')])
        })
        expect(handler).toHaveBeenCalledTimes(1) // no new call
    })

    it('subscribes to custom events via emit', () => {
        const handler = vi.fn()
        const { result } = renderHook(() => useUpupUpload(opts))
        act(() => {
            result.current.on('my-custom-event', handler)
        })
        act(() => {
            result.current.core.emit('my-custom-event', { data: 'test' })
        })
        expect(handler).toHaveBeenCalledWith({ data: 'test' })
    })
})

describe('useUpupUpload — reorderFiles', () => {
    it('reorders files by id array', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
                makeFile('c.txt'),
            ])
        })
        const ids = result.current.files.map(f => f.id)
        const reversed = [...ids].reverse()

        act(() => {
            result.current.reorderFiles(reversed)
        })

        const newIds = result.current.files.map(f => f.id)
        expect(newIds).toEqual(reversed)
    })

    it('preserves file count after reorder', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([
                makeFile('x.txt'),
                makeFile('y.txt'),
            ])
        })
        const ids = result.current.files.map(f => f.id)

        act(() => {
            result.current.reorderFiles([...ids].reverse())
        })
        expect(result.current.files.length).toBe(2)
    })
})
