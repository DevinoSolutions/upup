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

function makeFile(name = 'test.txt', content = 'hello', type = 'text/plain'): File {
    return new File([content], name, { type })
}

// ─────────────────────────────────────────────
// addFiles
// ─────────────────────────────────────────────
describe('useUpupUpload — addFiles', () => {
    it('adding files increases the files array length', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        })
        expect(result.current.files.length).toBe(2)
    })

    it('files have the correct names after addFiles', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('hello.txt')])
        })
        expect(result.current.files[0].name).toBe('hello.txt')
    })

    it('adding an empty array leaves files unchanged', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([])
        })
        expect(result.current.files.length).toBe(0)
    })

    it('calling addFiles twice accumulates files', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt')])
        })
        await act(async () => {
            await result.current.addFiles([makeFile('b.txt')])
        })
        expect(result.current.files.length).toBe(2)
    })
})

// ─────────────────────────────────────────────
// removeFile
// ─────────────────────────────────────────────
describe('useUpupUpload — removeFile', () => {
    it('removes a file by id', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('remove-me.txt')])
        })
        const fileId = result.current.files[0].id
        act(() => {
            result.current.removeFile(fileId)
        })
        expect(result.current.files.length).toBe(0)
    })

    it('does not throw when removing a non-existent id', () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        expect(() => {
            act(() => { result.current.removeFile('ghost-id') })
        }).not.toThrow()
    })

    it('only removes the targeted file', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('keep.txt'), makeFile('remove.txt')])
        })
        const removeId = result.current.files.find(f => f.name === 'remove.txt')!.id
        act(() => { result.current.removeFile(removeId) })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toBe('keep.txt')
    })
})

// ─────────────────────────────────────────────
// removeAll
// ─────────────────────────────────────────────
describe('useUpupUpload — removeAll', () => {
    it('removes all files', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')])
        })
        act(() => { result.current.removeAll() })
        expect(result.current.files.length).toBe(0)
    })

    it('does not throw when no files are present', () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        expect(() => {
            act(() => { result.current.removeAll() })
        }).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// setFiles
// ─────────────────────────────────────────────
describe('useUpupUpload — setFiles', () => {
    it('replaces all existing files', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('old.txt')])
        })
        await act(async () => {
            await result.current.setFiles([makeFile('new.txt')])
        })
        expect(result.current.files.length).toBe(1)
        expect(result.current.files[0].name).toBe('new.txt')
    })

    it('setFiles with empty array clears all files', async () => {
        const { result } = renderHook(() => useUpupUpload({ provider: 'S3' as const }))
        await act(async () => {
            await result.current.addFiles([makeFile('a.txt')])
        })
        await act(async () => {
            await result.current.setFiles([])
        })
        expect(result.current.files.length).toBe(0)
    })
})

// ─────────────────────────────────────────────
// onFileAdded callback option
// ─────────────────────────────────────────────
describe('useUpupUpload — onFileAdded callback', () => {
    it('calls onFileAdded when files are added', async () => {
        const onFileAdded = vi.fn()
        const { result } = renderHook(() =>
            useUpupUpload({ provider: 'S3' as const, onFileAdded }),
        )
        await act(async () => {
            await result.current.addFiles([makeFile('callback.txt')])
        })
        expect(onFileAdded).toHaveBeenCalled()
    })
})
