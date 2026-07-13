import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upupjs/core'

const opts = { provider: 'S3' as const }

describe('useUpupUpload — extended', () => {
    // ── API shape ──
    it('exposes file operation methods', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(typeof result.current.addFiles).toBe('function')
        expect(typeof result.current.removeFile).toBe('function')
        expect(typeof result.current.removeAll).toBe('function')
        expect(typeof result.current.setFiles).toBe('function')
        expect(typeof result.current.reorderFiles).toBe('function')
    })

    it('exposes upload control methods', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(typeof result.current.upload).toBe('function')
        expect(typeof result.current.pause).toBe('function')
        expect(typeof result.current.resume).toBe('function')
        expect(typeof result.current.cancel).toBe('function')
        expect(typeof result.current.retry).toBe('function')
    })

    it('exposes prop getter methods', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(typeof result.current.getDropzoneProps).toBe('function')
        expect(typeof result.current.getRootProps).toBe('function')
        expect(typeof result.current.getInputProps).toBe('function')
    })

    it('exposes core, on, and ext', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(result.current.core).toBeTruthy()
        expect(typeof result.current.on).toBe('function')
        expect(typeof result.current.ext).toBe('object')
    })

    // ── Initial state ──
    it('status starts at IDLE', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(result.current.status).toBe(UploadStatus.IDLE)
    })

    it('files starts empty', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(result.current.files).toEqual([])
    })

    it('error starts null', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(result.current.error).toBeNull()
    })

    it('progress starts at zero', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(result.current.progress).toEqual({
            totalFiles: 0,
            completedFiles: 0,
            percentage: 0,
        })
    })

    // ── Prop getters ──
    it('getInputProps returns hidden file input', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        const props = result.current.getInputProps()
        expect(props.type).toBe('file')
        expect(props.style).toEqual({ display: 'none' })
    })

    it('getInputProps passes accept option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, allowedFileTypes: 'image/*' }),
        )
        const props = result.current.getInputProps()
        expect(props.accept).toBe('image/*')
    })

    it('getDropzoneProps returns event handlers', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        const props = result.current.getDropzoneProps()
        expect(typeof props.onDragOver).toBe('function')
        expect(typeof props.onDragLeave).toBe('function')
        expect(typeof props.onDrop).toBe('function')
        expect(typeof props.onPaste).toBe('function')
    })

    // ── File operations ──
    it('addFiles adds files and updates state', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([
                new File(['x'], 'test.txt', { type: 'text/plain' }),
            ])
        })
        expect(result.current.files.length).toBe(1)
    })

    it('removeAll clears all files', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([
                new File(['a'], 'a.txt', { type: 'text/plain' }),
                new File(['b'], 'b.txt', { type: 'text/plain' }),
            ])
        })
        expect(result.current.files.length).toBe(2)
        act(() => {
            result.current.removeAll()
        })
        expect(result.current.files.length).toBe(0)
    })

    it('removeFile removes a specific file', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([
                new File(['a'], 'a.txt', { type: 'text/plain' }),
                new File(['b'], 'b.txt', { type: 'text/plain' }),
            ])
        })
        const fileId = result.current.files[0]!.id
        act(() => {
            result.current.removeFile(fileId)
        })
        expect(result.current.files.length).toBe(1)
    })

    // ── Event system ──
    it('on() subscribes to core events', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        const handler = vi.fn()
        act(() => {
            result.current.on('files-added', handler)
        })
        await act(async () => {
            await result.current.addFiles([
                new File(['x'], 't.txt', { type: 'text/plain' }),
            ])
        })
        expect(handler).toHaveBeenCalled()
    })

    it('on() returns unsubscribe function', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        let unsub: () => void
        act(() => {
            unsub = result.current.on('custom:event', vi.fn())
        })
        expect(typeof unsub!).toBe('function')
    })

    // ── Options ──
    it('accepts limit option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, limit: 3 }),
        )
        expect(result.current).toBeDefined()
    })

    it('accepts maxFileSize option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, maxFileSize: { size: 5, unit: 'MB' } }),
        )
        expect(result.current).toBeDefined()
    })

    it('accepts autoUpload option', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, autoUpload: true }),
        )
        expect(result.current).toBeDefined()
    })

    // ── Multiple instances ──
    it('multiple hook instances are independent', async () => {
        const { result: r1 } = renderHook(() => useUpupUpload(opts))
        const { result: r2 } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await r1.current.addFiles([
                new File(['x'], 'x.txt', { type: 'text/plain' }),
            ])
        })
        expect(r1.current.files.length).toBe(1)
        expect(r2.current.files.length).toBe(0)
    })
})
