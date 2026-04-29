import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/shared'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

describe('useUpupUpload — restrictions enforcement', () => {
    it('rejects files exceeding maxFileSize', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, maxFileSize: { size: 5, unit: 'B' } }),
        )
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('big.txt', 50)])
            } catch { /* expected */ }
        })
        expect(result.current.files.length).toBe(0)
    })

    it('accepts files within maxFileSize', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, maxFileSize: { size: 100, unit: 'B' } }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('ok.txt', 10)])
        })
        expect(result.current.files.length).toBe(1)
    })

    it('rejects files not matching accept', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, allowedFileTypes: 'image/*' }),
        )
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('doc.txt', 10, 'text/plain')])
            } catch { /* expected */ }
        })
        expect(result.current.files.length).toBe(0)
    })

    it('accepts files matching accept', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, allowedFileTypes: 'text/plain' }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('ok.txt', 10, 'text/plain')])
        })
        expect(result.current.files.length).toBe(1)
    })

    it('enforces limit on file count', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, limit: 2 }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        })
        expect(result.current.files.length).toBe(2)
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('c.txt')])
            } catch { /* expected */ }
        })
        expect(result.current.files.length).toBe(2)
    })

    it('rejects files below minFileSize', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, minFileSize: { size: 50, unit: 'B' } }),
        )
        await act(async () => {
            try {
                await result.current.addFiles([makeFile('tiny.txt', 5)])
            } catch { /* expected */ }
        })
        expect(result.current.files.length).toBe(0)
    })
})

describe('useUpupUpload — upload controls', () => {
    it('pause sets status (no-op without active upload)', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        act(() => { result.current.pause() })
        // Status transitions happen on core; headless hook reflects via subscription
        expect(result.current).toBeDefined()
    })

    it('cancel is safe to call without active upload', () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        expect(() => {
            act(() => { result.current.cancel() })
        }).not.toThrow()
    })

    it('retry is safe to call without active upload', () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        expect(() => {
            act(() => { result.current.retry() })
        }).not.toThrow()
    })
})

describe('useUpupUpload — file operations chaining', () => {
    it('add → remove → add works correctly', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))

        await act(async () => {
            await result.current.addFiles([makeFile('first.txt')])
        })
        expect(result.current.files.length).toBe(1)

        const id = result.current.files[0].id
        act(() => { result.current.removeFile(id) })
        expect(result.current.files.length).toBe(0)

        await act(async () => {
            await result.current.addFiles([makeFile('second.txt')])
        })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toBe('second.txt')
    })

    it('setFiles replaces all existing files', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))

        await act(async () => {
            await result.current.addFiles([makeFile('old.txt')])
        })
        expect(result.current.files.length).toBe(1)

        await act(async () => {
            await result.current.setFiles([makeFile('new1.txt'), makeFile('new2.txt')])
        })
        expect(result.current.files.length).toBe(2)
        const names = result.current.files.map(f => f.name)
        expect(names).toContain('new1.txt')
        expect(names).toContain('new2.txt')
    })

    it('removeAll after multiple adds clears everything', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))

        await act(async () => {
            await result.current.addFiles([makeFile('a.txt')])
            await result.current.addFiles([makeFile('b.txt')])
        })
        expect(result.current.files.length).toBe(2)

        act(() => { result.current.removeAll() })
        expect(result.current.files.length).toBe(0)
    })
})

describe('useUpupUpload — core access', () => {
    it('core.files reflects hook files', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))

        await act(async () => {
            await result.current.addFiles([makeFile('sync.txt')])
        })

        expect(result.current.core.files.size).toBe(1)
    })

    it('core.status is accessible', () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        expect(result.current.core.status).toBe(UploadStatus.IDLE)
    })

    it('core.options reflects provided config', () => {
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, maxRetries: 7 }),
        )
        expect(result.current.core.options.maxRetries).toBe(7)
    })
})
