import { describe, it, expect, vi } from 'vitest'
import useUpload from '../src/hooks/useUpload'
import { UploadStatus } from '../src/context/RootContext'

function makeUploadCtx(overrides: Record<string, unknown> = {}) {
    return {
        proceedUpload: vi.fn(),
        uploadStatus: UploadStatus.PENDING,
        uploadError: '',
        totalProgress: 0,
        filesProgressMap: {},
        setUploadStatus: vi.fn(),
        uploadSpeed: 0,
        uploadEta: 0,
        uploadedBytes: 0,
        totalBytes: 0,
        ...overrides,
    }
}

function makeFiles(...names: string[]) {
    const map = new Map<string, any>()
    for (const name of names) {
        const f = Object.assign(new File(['x'], name, { type: 'text/plain' }), { id: name })
        map.set(name, f)
    }
    return map
}

describe('useUpload', () => {
    it('maps proceedUpload to upload', () => {
        const fn = vi.fn()
        const result = useUpload({
            upload: makeUploadCtx({ proceedUpload: fn }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.upload).toBe(fn)
    })

    it('loading is true when uploadStatus is ONGOING', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.ONGOING }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.loading).toBe(true)
    })

    it('loading is false when uploadStatus is PENDING', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.PENDING }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.loading).toBe(false)
    })

    it('loading is false when uploadStatus is SUCCESSFUL', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.SUCCESSFUL }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.loading).toBe(false)
    })

    it('loading is false when uploadStatus is FAILED', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.FAILED }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.loading).toBe(false)
    })

    it('maps uploadError to error', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadError: 'Network timeout' }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.error).toBe('Network timeout')
    })

    it('maps totalProgress to progress', () => {
        const result = useUpload({
            upload: makeUploadCtx({ totalProgress: 75 }),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.progress).toBe(75)
    })

    it('converts files Map to an array', () => {
        const result = useUpload({
            upload: makeUploadCtx(),
            files: makeFiles('a.txt', 'b.txt', 'c.txt'),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(Array.isArray(result.files)).toBe(true)
        expect(result.files).toHaveLength(3)
    })

    it('returns empty array when no files', () => {
        const result = useUpload({
            upload: makeUploadCtx(),
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.files).toHaveLength(0)
    })

    it('passes through setFiles, dynamicallyReplaceFiles, dynamicUpload, resetState', () => {
        const setFiles = vi.fn()
        const dynamicallyReplaceFiles = vi.fn()
        const dynamicUpload = vi.fn()
        const resetState = vi.fn()
        const result = useUpload({
            upload: makeUploadCtx(),
            files: new Map(),
            setFiles,
            dynamicallyReplaceFiles,
            dynamicUpload,
            resetState,
        } as any)
        expect(result.setFiles).toBe(setFiles)
        expect(result.dynamicallyReplaceFiles).toBe(dynamicallyReplaceFiles)
        expect(result.dynamicUpload).toBe(dynamicUpload)
        expect(result.resetState).toBe(resetState)
    })

    it('handles undefined upload gracefully', () => {
        const result = useUpload({
            upload: undefined as any,
            files: new Map(),
            setFiles: vi.fn(),
            dynamicallyReplaceFiles: vi.fn(),
            dynamicUpload: vi.fn(),
            resetState: vi.fn(),
        } as any)
        expect(result.upload).toBeUndefined()
        expect(result.loading).toBe(false)
        expect(result.error).toBeUndefined()
        expect(result.progress).toBeUndefined()
    })
})
