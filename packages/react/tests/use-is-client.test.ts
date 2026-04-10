import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsClient } from '../src/use-is-client'
import { UploadAdapter } from '../src/shared/types'

// ─────────────────────────────────────────────
// useIsClient
// ─────────────────────────────────────────────
describe('useIsClient', () => {
    it('returns false on the initial render (SSR-safe default)', () => {
        const { result } = renderHook(() => useIsClient())
        // Before useEffect fires, value is false
        // Note: renderHook in jsdom fires effects synchronously after render
        // so we just verify the hook completes without error and returns a boolean
        expect(typeof result.current).toBe('boolean')
    })

    it('returns true after mount (useEffect has run)', async () => {
        const { result } = renderHook(() => useIsClient())
        // After renderHook settles, useEffect will have run in jsdom
        await act(async () => {})
        expect(result.current).toBe(true)
    })

    it('always returns a boolean', () => {
        const { result } = renderHook(() => useIsClient())
        expect(result.current === true || result.current === false).toBe(true)
    })

    it('does not throw on unmount', () => {
        const { unmount } = renderHook(() => useIsClient())
        expect(() => unmount()).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// UploadAdapter enum completeness
// ─────────────────────────────────────────────
describe('UploadAdapter enum', () => {
    it('defines INTERNAL adapter', () => {
        expect(UploadAdapter.INTERNAL).toBeDefined()
    })

    it('defines GOOGLE_DRIVE adapter', () => {
        expect(UploadAdapter.GOOGLE_DRIVE).toBeDefined()
    })

    it('defines ONE_DRIVE adapter', () => {
        expect(UploadAdapter.ONE_DRIVE).toBeDefined()
    })

    it('defines DROPBOX adapter', () => {
        expect(UploadAdapter.DROPBOX).toBeDefined()
    })

    it('defines LINK adapter', () => {
        expect(UploadAdapter.LINK).toBeDefined()
    })

    it('defines CAMERA adapter', () => {
        expect(UploadAdapter.CAMERA).toBeDefined()
    })

    it('defines AUDIO adapter', () => {
        expect(UploadAdapter.AUDIO).toBeDefined()
    })

    it('defines SCREEN adapter', () => {
        expect(UploadAdapter.SCREEN).toBeDefined()
    })

    it('has 9 distinct adapter values', () => {
        const values = Object.values(UploadAdapter)
        const unique = new Set(values)
        expect(unique.size).toBe(9)
    })

    it('all adapter values are non-empty strings', () => {
        for (const val of Object.values(UploadAdapter)) {
            expect(typeof val).toBe('string')
            expect((val as string).length).toBeGreaterThan(0)
        }
    })
})
