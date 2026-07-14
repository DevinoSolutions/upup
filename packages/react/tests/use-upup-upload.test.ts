import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { UploadStatus } from '@upupjs/core'
import { useUpupUpload } from '../src/use-upup-upload'

// Stub browser APIs not present in jsdom
beforeEach(() => {
    vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:test'),
        revokeObjectURL: vi.fn(),
    })
})

const minimalOptions = { provider: 'S3' as const }

// ─────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────
describe('useUpupUpload — initial state', () => {
    it('returns IDLE status', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(result.current.status).toBe(UploadStatus.IDLE)
    })

    it('returns empty files array', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(result.current.files).toEqual([])
    })

    it('returns zeroed progress', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(result.current.progress).toEqual({
            totalFiles: 0,
            completedFiles: 0,
            percentage: 0,
        })
    })

    it('returns null error', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(result.current.error).toBeNull()
    })
})

// ─────────────────────────────────────────────
// Returned shape
// ─────────────────────────────────────────────
describe('useUpupUpload — returned shape', () => {
    it('exposes all required action methods', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(typeof result.current.addFiles).toBe('function')
        expect(typeof result.current.removeFile).toBe('function')
        expect(typeof result.current.removeAll).toBe('function')
        expect(typeof result.current.setFiles).toBe('function')
        expect(typeof result.current.reorderFiles).toBe('function')
        expect(typeof result.current.upload).toBe('function')
        expect(typeof result.current.pause).toBe('function')
        expect(typeof result.current.resume).toBe('function')
        expect(typeof result.current.cancel).toBe('function')
        expect(typeof result.current.retry).toBe('function')
    })

    it('exposes on() event subscription', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(typeof result.current.on).toBe('function')
    })

    it('exposes core instance', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(result.current.core).toBeTruthy()
    })

    it('exposes prop getter functions', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(typeof result.current.getDropzoneProps).toBe('function')
        expect(typeof result.current.getRootProps).toBe('function')
        expect(typeof result.current.getInputProps).toBe('function')
    })

    it('exposes ext as an object', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(typeof result.current.ext).toBe('object')
    })
})

// ─────────────────────────────────────────────
// Prop getters
// ─────────────────────────────────────────────
describe('useUpupUpload — prop getters', () => {
    it('getDropzoneProps returns required drag handlers', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        const props = result.current.getDropzoneProps()
        expect(typeof props.onDragOver).toBe('function')
        expect(typeof props.onDragLeave).toBe('function')
        expect(typeof props.onDrop).toBe('function')
    })

    it('getRootProps returns role=application', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        expect(result.current.getRootProps().role).toBe('application')
    })

    it('getInputProps returns type=file with hidden style', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        const props = result.current.getInputProps()
        expect(props.type).toBe('file')
        expect(props.style).toMatchObject({ display: 'none' })
    })
})

// ─────────────────────────────────────────────
// on() delegation
// ─────────────────────────────────────────────
describe('useUpupUpload — on() delegation', () => {
    it('on() returns an unsubscribe function', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        const unsub = result.current.on('files-added', vi.fn())
        expect(typeof unsub).toBe('function')
    })

    it('unsubscribe function does not throw', () => {
        const { result } = renderHook(() => useUpupUpload(minimalOptions))
        const unsub = result.current.on('files-added', vi.fn())
        expect(() => unsub()).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────
describe('useUpupUpload — cleanup', () => {
    it('does not throw on unmount', () => {
        const { unmount } = renderHook(() => useUpupUpload(minimalOptions))
        expect(() => unmount()).not.toThrow()
    })
})
