import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'

beforeEach(() => {
    vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => `blob:test-${Math.random()}`),
        revokeObjectURL: vi.fn(),
    })
})

function makeFile(
    name = 'test.txt',
    content = 'hello',
    type = 'text/plain',
): File {
    return new File([content], name, { type })
}

// ─────────────────────────────────────────────
// reorderFiles
// ─────────────────────────────────────────────
describe('useUpupUpload — reorderFiles', () => {
    it('reorders files to the given sequence', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
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
        expect(result.current.files.map(f => f.id)).toEqual(reversed)
    })

    it('preserves order when given the same sequence', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
            ])
        })
        const ids = result.current.files.map(f => f.id)
        act(() => {
            result.current.reorderFiles(ids)
        })
        expect(result.current.files.map(f => f.id)).toEqual(ids)
    })

    it('supports partial reorder (swap two)', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
                makeFile('c.txt'),
            ])
        })
        const [id0, id1, id2] = result.current.files.map(f => f.id)
        act(() => {
            result.current.reorderFiles([id1!, id0!, id2!])
        })
        const names = result.current.files.map(f => f.name)
        expect(names[0]).toBe('b.txt')
        expect(names[1]).toBe('a.txt')
        expect(names[2]).toBe('c.txt')
    })
})

// ─────────────────────────────────────────────
// upload controls: pause / resume / cancel / retry
// ─────────────────────────────────────────────
describe('useUpupUpload — upload controls', () => {
    it('pause() does not throw when idle', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(() => {
            act(() => {
                result.current.pause()
            })
        }).not.toThrow()
    })

    it('resume() does not throw when idle', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(() => {
            act(() => {
                result.current.resume()
            })
        }).not.toThrow()
    })

    it('cancel() does not throw when idle', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(() => {
            act(() => {
                result.current.cancel()
            })
        }).not.toThrow()
    })

    it('retry() without fileId does not throw', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(() => {
            act(() => {
                result.current.retry()
            })
        }).not.toThrow()
    })

    it('retry() with a nonexistent fileId does not throw', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(() => {
            act(() => {
                result.current.retry('nonexistent-id')
            })
        }).not.toThrow()
    })

    it('pause then resume does not throw', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const }),
        )
        expect(() => {
            act(() => {
                result.current.pause()
                result.current.resume()
            })
        }).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// onFileRemoved callback
// ─────────────────────────────────────────────
describe('useUpupUpload — onFileRemoved callback', () => {
    it('calls onFileRemoved when a file is removed', async () => {
        const onFileRemoved = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, onFileRemoved }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('to-remove.txt')])
        })
        const fileId = result.current.files[0]!.id
        act(() => {
            result.current.removeFile(fileId)
        })
        expect(onFileRemoved).toHaveBeenCalled()
    })

    it('does not call onFileRemoved for a nonexistent id', async () => {
        const onFileRemoved = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, onFileRemoved }),
        )
        act(() => {
            result.current.removeFile('ghost-id')
        })
        expect(onFileRemoved).not.toHaveBeenCalled()
    })

    it('calls onFileRemoved once per removed file', async () => {
        const onFileRemoved = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, onFileRemoved }),
        )
        await act(async () => {
            await result.current.addFiles([
                makeFile('a.txt'),
                makeFile('b.txt'),
            ])
        })
        const [id0, id1] = result.current.files.map(f => f.id)
        act(() => {
            result.current.removeFile(id0!)
        })
        act(() => {
            result.current.removeFile(id1!)
        })
        expect(onFileRemoved).toHaveBeenCalledTimes(2)
    })
})
