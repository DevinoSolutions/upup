// Contract: resumable multipart uploads must survive a page reload by
// persisting session state in localStorage; expired or corrupted state must
// self-heal silently rather than surface as a crash; and total absence of
// localStorage (private browsing, disabled storage) must degrade every
// public function in this module to a safe no-op/null instead of throwing.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    saveSession,
    loadSession,
    updateSessionProgress,
    removeSession,
    clearAllSessions,
    fileFingerprint,
    type MultipartSession,
} from '../src/utils/multipart-session-store'

// Minimal in-memory Storage stand-in — test infrastructure bridging the Web
// Storage API this module expects onto vitest's `node` environment (no real
// localStorage), not a mock of the code under test.
class MemoryStorage {
    private store = new Map<string, string>()

    getItem(key: string): string | null {
        return this.store.has(key) ? (this.store.get(key) as string) : null
    }
    setItem(key: string, value: string): void {
        this.store.set(key, value)
    }
    removeItem(key: string): void {
        this.store.delete(key)
    }
    clear(): void {
        this.store.clear()
    }
    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null
    }
    get length(): number {
        return this.store.size
    }
}

// Mirrors the private STORAGE_PREFIX ('upup_mp_') + storageKey() in src —
// neither is exported, so the raw key is reconstructed here to probe the
// backing store directly (pinned from packages/core/src/utils/multipart-session-store.ts).
const rawKey = (fingerprint: string) => `upup_mp_${fingerprint}`
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // pinned from src

function makeSession(
    overrides: Partial<MultipartSession> = {},
): MultipartSession {
    return {
        provider: 's3',
        key: 'uploads/video.mp4',
        uploadId: 'upload-abc-123',
        partSize: 5 * 1024 * 1024,
        updatedAt: Date.now(),
        uploadedBytes: 0,
        ...overrides,
    }
}

function makeFile(
    name: string,
    size: number,
    lastModified = 1_700_000_000_000,
): File {
    return new File([new Uint8Array(size)], name, {
        type: 'video/mp4',
        lastModified,
    })
}

describe('multipart session store', () => {
    let storage: MemoryStorage

    beforeEach(() => {
        storage = new MemoryStorage()
        vi.stubGlobal('localStorage', storage)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it('loads a saved session back with identical fields for the same file fingerprint', () => {
        const fp = fileFingerprint(makeFile('movie.mp4', 12345))
        const session = makeSession()

        saveSession(fp, session)

        expect(loadSession(fp)).toEqual(session)
    })

    it('cannot load a session older than the 24h TTL, and removes the stale entry from storage', () => {
        vi.useFakeTimers()
        const start = new Date('2026-01-01T00:00:00.000Z').getTime()
        vi.setSystemTime(start)

        const fp = fileFingerprint(makeFile('old.mp4', 999))
        saveSession(fp, makeSession({ updatedAt: start }))
        expect(storage.getItem(rawKey(fp))).not.toBeNull()

        // Just past the 24h boundary.
        vi.setSystemTime(start + SESSION_TTL_MS + 1)

        expect(loadSession(fp)).toBeNull()
        expect(storage.getItem(rawKey(fp))).toBeNull()
    })

    it('does not crash on corrupted JSON in the storage slot, and yields null', () => {
        const fp = fileFingerprint(makeFile('corrupt.mp4', 42))
        storage.setItem(rawKey(fp), '{not-valid-json')

        expect(() => loadSession(fp)).not.toThrow()
        expect(loadSession(fp)).toBeNull()
        // Pinned behavior: unlike TTL expiry (which calls removeSession), a
        // JSON parse failure does NOT clean up the corrupted entry — it is
        // caught and swallowed, leaving the bad data in storage untouched.
        expect(storage.getItem(rawKey(fp))).toBe('{not-valid-json')
    })

    it('persists updated progress for a subsequent load', () => {
        const fp = fileFingerprint(makeFile('progress.mp4', 555))
        saveSession(fp, makeSession({ uploadedBytes: 100 }))

        updateSessionProgress(fp, 4096)

        expect(loadSession(fp)?.uploadedBytes).toBe(4096)
    })

    it('removes exactly its own key and leaves other sessions intact', () => {
        const fpA = fileFingerprint(makeFile('a.mp4', 1))
        const fpB = fileFingerprint(makeFile('b.mp4', 2))
        saveSession(fpA, makeSession({ uploadId: 'upload-a' }))
        saveSession(fpB, makeSession({ uploadId: 'upload-b' }))

        removeSession(fpA)

        expect(loadSession(fpA)).toBeNull()
        expect(loadSession(fpB)?.uploadId).toBe('upload-b')
    })

    it('clears every session it owns and leaves foreign keys untouched', () => {
        const fpA = fileFingerprint(makeFile('a.mp4', 1))
        const fpB = fileFingerprint(makeFile('b.mp4', 2))
        saveSession(fpA, makeSession())
        saveSession(fpB, makeSession())
        storage.setItem('some_other_app_setting', 'keep-me')

        clearAllSessions()

        expect(loadSession(fpA)).toBeNull()
        expect(loadSession(fpB)).toBeNull()
        expect(storage.getItem('some_other_app_setting')).toBe('keep-me')
    })

    it('degrades every public function to a safe no-op/null when localStorage is entirely absent', () => {
        // Delete the stub outright (not merely set to undefined) so the bare
        // `localStorage` reference in src hits the same failure mode a real
        // storage-less environment would produce.
        delete (globalThis as { localStorage?: unknown }).localStorage

        const fp = fileFingerprint(makeFile('nostorage.mp4', 7))

        expect(() => saveSession(fp, makeSession())).not.toThrow()
        expect(() => loadSession(fp)).not.toThrow()
        expect(loadSession(fp)).toBeNull()
        expect(() => updateSessionProgress(fp, 10)).not.toThrow()
        expect(() => removeSession(fp)).not.toThrow()
        expect(() => clearAllSessions()).not.toThrow()
    })

    describe('fileFingerprint', () => {
        it('is stable for identical name/size/lastModified/type inputs', () => {
            const a = makeFile('same.mp4', 100, 1_700_000_000_000)
            const b = makeFile('same.mp4', 100, 1_700_000_000_000)

            expect(fileFingerprint(a)).toBe(fileFingerprint(b))
        })

        it('differs when size differs', () => {
            const a = makeFile('same.mp4', 100, 1_700_000_000_000)
            const b = makeFile('same.mp4', 200, 1_700_000_000_000)

            expect(fileFingerprint(a)).not.toBe(fileFingerprint(b))
        })
    })
})
