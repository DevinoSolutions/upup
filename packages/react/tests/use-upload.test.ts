import { describe, it, expect, vi } from 'vitest'
import useUpload from '../src/hooks/useUpload'
import { UploadStatus, FileSource } from '@upupjs/core'
import type { UploadFile } from '@upupjs/core'

function makeUploadCtx(overrides: Record<string, unknown> = {}) {
    return {
        startUpload: vi.fn(),
        retryUpload: vi.fn(),
        uploadStatus: UploadStatus.IDLE,
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
    const map = new Map<string, UploadFile>()
    for (const name of names) {
        const f = Object.assign(new File(['x'], name, { type: 'text/plain' }), {
            id: name,
            source: FileSource.LOCAL,
            status: UploadStatus.IDLE,
            metadata: {},
        })
        map.set(name, f)
    }
    return map
}

describe('useUpload', () => {
    it('maps startUpload to upload', () => {
        const fn = vi.fn()
        const result = useUpload({
            upload: makeUploadCtx({ startUpload: fn }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.upload).toBe(fn)
    })

    it('loading is true when uploadStatus is UPLOADING', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.UPLOADING }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.loading).toBe(true)
    })

    it('loading is false when uploadStatus is IDLE', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.IDLE }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.loading).toBe(false)
    })

    it('loading is false when uploadStatus is SUCCESSFUL', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.SUCCESSFUL }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.loading).toBe(false)
    })

    it('loading is false when uploadStatus is FAILED', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadStatus: UploadStatus.FAILED }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.loading).toBe(false)
    })

    it('maps uploadError to error', () => {
        const result = useUpload({
            upload: makeUploadCtx({ uploadError: 'Network timeout' }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.error).toBe('Network timeout')
    })

    it('maps totalProgress to progress', () => {
        const result = useUpload({
            upload: makeUploadCtx({ totalProgress: 75 }),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.progress).toBe(75)
    })

    it('converts files Map to an array', () => {
        const result = useUpload({
            upload: makeUploadCtx(),
            files: makeFiles('a.txt', 'b.txt', 'c.txt'),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(Array.isArray(result.files)).toBe(true)
        expect(result.files).toHaveLength(3)
    })

    it('returns empty array when no files', () => {
        const result = useUpload({
            upload: makeUploadCtx(),
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.files).toHaveLength(0)
    })

    it('passes through setFiles, replaceFiles, uploadFiles, resetState', () => {
        const setFiles = vi.fn()
        const replaceFiles = vi.fn()
        const uploadFiles = vi.fn()
        const resetState = vi.fn()
        const result = useUpload({
            upload: makeUploadCtx(),
            files: new Map(),
            setFiles,
            replaceFiles,
            uploadFiles,
            resetState,
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.setFiles).toBe(setFiles)
        expect(result.replaceFiles).toBe(replaceFiles)
        expect(result.uploadFiles).toBe(uploadFiles)
        expect(result.resetState).toBe(resetState)
    })

    it('handles undefined upload gracefully', () => {
        const result = useUpload({
            upload: undefined as unknown as Parameters<
                typeof useUpload
            >[0]['upload'],
            files: new Map(),
            setFiles: vi.fn(),
            replaceFiles: vi.fn(),
            uploadFiles: vi.fn(),
            resetState: vi.fn(),
        } as unknown as Parameters<typeof useUpload>[0])
        expect(result.upload).toBeUndefined()
        expect(result.loading).toBe(false)
        expect(result.error).toBeUndefined()
        expect(result.progress).toBeUndefined()
    })
})
