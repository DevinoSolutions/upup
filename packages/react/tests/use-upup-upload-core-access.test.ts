import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/shared'

const opts = { provider: 'S3' as const }
const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

describe('useUpupUpload — core.validateFiles access', () => {
    it('validates a good file as valid', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, accept: 'text/plain' }),
        )
        const results = await result.current.core.validateFiles([
            makeFile('ok.txt', 10, 'text/plain'),
        ])
        expect(results).toHaveLength(1)
        expect(results[0].valid).toBe(true)
    })

    it('validates a bad file type as invalid', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, accept: 'text/plain' }),
        )
        const results = await result.current.core.validateFiles([
            makeFile('bad.png', 10, 'image/png'),
        ])
        expect(results[0].valid).toBe(false)
        expect(results[0].errors[0].code).toBe('TYPE_MISMATCH')
    })

    it('validates file too large', async () => {
        const { result } = renderHook(() =>
            useUpupUpload({ ...opts, maxFileSize: { size: 5, unit: 'B' } }),
        )
        const results = await result.current.core.validateFiles([
            makeFile('big.txt', 50),
        ])
        expect(results[0].valid).toBe(false)
        expect(results[0].errors[0].code).toBe('FILE_TOO_LARGE')
    })

    it('validateFiles does not modify hook files', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([makeFile('existing.txt')])
        })
        await result.current.core.validateFiles([makeFile('check.txt')])
        expect(result.current.files.length).toBe(1) // unchanged
    })
})

describe('useUpupUpload — core.progress access', () => {
    it('progress reflects zero when no files', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        expect(result.current.core.progress).toEqual({
            totalFiles: 0,
            completedFiles: 0,
            percentage: 0,
        })
    })

    it('progress reflects added files', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        })
        expect(result.current.core.progress.totalFiles).toBe(2)
        expect(result.current.core.progress.completedFiles).toBe(0)
    })
})

describe('useUpupUpload — core.getSnapshot access', () => {
    it('getSnapshot returns current state', async () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        await act(async () => {
            await result.current.addFiles([makeFile('snap.txt')])
        })
        const snap = result.current.core.getSnapshot()
        expect(snap.files).toHaveLength(1)
        expect(snap.status).toBe(UploadStatus.IDLE)
    })

    it('getSnapshot returns empty when no files', () => {
        const { result } = renderHook(() => useUpupUpload(opts))
        const snap = result.current.core.getSnapshot()
        expect(snap.files).toHaveLength(0)
    })
})
