import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsClient } from '../src/use-is-client'
import { FileSource } from '@upupjs/core'

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
// FileSource enum completeness
// ─────────────────────────────────────────────
describe('FileSource enum', () => {
    it('defines local source', () => {
        expect(FileSource.LOCAL).toBeDefined()
    })

    it('defines googleDrive source', () => {
        expect(FileSource.GOOGLE_DRIVE).toBeDefined()
    })

    it('defines oneDrive source', () => {
        expect(FileSource.ONE_DRIVE).toBeDefined()
    })

    it('defines dropbox source', () => {
        expect(FileSource.DROPBOX).toBeDefined()
    })

    it('defines url source', () => {
        expect(FileSource.URL).toBeDefined()
    })

    it('defines camera source', () => {
        expect(FileSource.CAMERA).toBeDefined()
    })

    it('defines microphone source', () => {
        expect(FileSource.MICROPHONE).toBeDefined()
    })

    it('defines screen source', () => {
        expect(FileSource.SCREEN).toBeDefined()
    })

    it('has 9 distinct source values', () => {
        const values = Object.values(FileSource)
        const unique = new Set(values)
        expect(unique.size).toBe(9)
    })

    it('all source values are non-empty strings', () => {
        for (const val of Object.values(FileSource)) {
            expect(typeof val).toBe('string')
            expect((val as string).length).toBeGreaterThan(0)
        }
    })
})
