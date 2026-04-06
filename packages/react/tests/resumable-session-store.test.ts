import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
    fileFingerprint,
    saveSession,
    loadSession,
    updateSessionProgress,
    removeSession,
    clearAllSessions,
    MultipartSession,
} from '../src/lib/resumable/multipartSessionStore'

const STORAGE_PREFIX = 'upup_mp_'

function makeSession(overrides: Partial<MultipartSession> = {}): MultipartSession {
    return {
        provider: 'S3',
        key: 'uploads/test-file.txt',
        uploadId: 'upload-id-123',
        partSize: 5 * 1024 * 1024,
        updatedAt: Date.now(),
        ...overrides,
    }
}

function makeFile(name = 'test.txt', size = 1024, lastModified = 1700000000000, type = 'text/plain'): File {
    const file = new File(['x'.repeat(size)], name, { type, lastModified })
    return file
}

beforeEach(() => {
    localStorage.clear()
})

afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
})

// ─────────────────────────────────────────────
// fileFingerprint
// ─────────────────────────────────────────────
describe('fileFingerprint', () => {
    it('returns a string', () => {
        const file = makeFile()
        expect(typeof fileFingerprint(file)).toBe('string')
    })

    it('includes the file name', () => {
        const file = makeFile('photo.jpg')
        expect(fileFingerprint(file)).toContain('photo.jpg')
    })

    it('includes the file size', () => {
        const file = makeFile('f.txt', 2048)
        expect(fileFingerprint(file)).toContain('2048')
    })

    it('includes the lastModified timestamp', () => {
        const file = makeFile('f.txt', 100, 1700000000000)
        expect(fileFingerprint(file)).toContain('1700000000000')
    })

    it('includes the MIME type', () => {
        const file = makeFile('img.png', 100, Date.now(), 'image/png')
        expect(fileFingerprint(file)).toContain('image/png')
    })

    it('produces different fingerprints for files with different names', () => {
        const a = makeFile('a.txt', 100, 1700000000000)
        const b = makeFile('b.txt', 100, 1700000000000)
        expect(fileFingerprint(a)).not.toBe(fileFingerprint(b))
    })

    it('produces different fingerprints for files with different sizes', () => {
        const a = makeFile('same.txt', 100, 1700000000000)
        const b = makeFile('same.txt', 200, 1700000000000)
        expect(fileFingerprint(a)).not.toBe(fileFingerprint(b))
    })

    it('produces the same fingerprint for identical metadata', () => {
        const a = makeFile('f.txt', 500, 1700000000000, 'text/plain')
        const b = makeFile('f.txt', 500, 1700000000000, 'text/plain')
        expect(fileFingerprint(a)).toBe(fileFingerprint(b))
    })
})

// ─────────────────────────────────────────────
// saveSession / loadSession
// ─────────────────────────────────────────────
describe('saveSession + loadSession', () => {
    it('round-trips a session through localStorage', () => {
        const fp = 'my-fingerprint'
        const session = makeSession()
        saveSession(fp, session)
        const loaded = loadSession(fp)
        expect(loaded).toMatchObject({
            provider: session.provider,
            key: session.key,
            uploadId: session.uploadId,
            partSize: session.partSize,
        })
    })

    it('returns null when no session is stored', () => {
        expect(loadSession('nonexistent-fp')).toBeNull()
    })

    it('stores under the correct localStorage key', () => {
        const fp = 'test-fp'
        saveSession(fp, makeSession())
        expect(localStorage.getItem(`${STORAGE_PREFIX}${fp}`)).not.toBeNull()
    })

    it('returns null and removes session when TTL is exceeded', () => {
        const fp = 'expired-fp'
        const expired = makeSession({ updatedAt: Date.now() - 25 * 60 * 60 * 1000 }) // 25h ago
        saveSession(fp, expired)
        const loaded = loadSession(fp)
        expect(loaded).toBeNull()
        // Also cleaned up from storage
        expect(localStorage.getItem(`${STORAGE_PREFIX}${fp}`)).toBeNull()
    })

    it('returns a valid session within TTL', () => {
        const fp = 'fresh-fp'
        const session = makeSession({ updatedAt: Date.now() - 60 * 1000 }) // 1 min ago
        saveSession(fp, session)
        expect(loadSession(fp)).not.toBeNull()
    })

    it('preserves optional uploadedBytes field', () => {
        const fp = 'bytes-fp'
        const session = makeSession({ uploadedBytes: 1024 * 100 })
        saveSession(fp, session)
        expect(loadSession(fp)?.uploadedBytes).toBe(1024 * 100)
    })

    it('returns null when localStorage throws (e.g. getItem error)', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage unavailable')
        })
        expect(loadSession('any-fp')).toBeNull()
    })

    it('silently ignores localStorage errors on save', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota exceeded')
        })
        expect(() => saveSession('fp', makeSession())).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// updateSessionProgress
// ─────────────────────────────────────────────
describe('updateSessionProgress', () => {
    it('updates uploadedBytes for an existing session', () => {
        const fp = 'progress-fp'
        saveSession(fp, makeSession({ uploadedBytes: 0 }))
        updateSessionProgress(fp, 512000)
        expect(loadSession(fp)?.uploadedBytes).toBe(512000)
    })

    it('updates updatedAt timestamp', () => {
        const fp = 'ts-fp'
        const before = Date.now()
        saveSession(fp, makeSession({ updatedAt: before - 5000 }))
        updateSessionProgress(fp, 100)
        const loaded = loadSession(fp)
        expect(loaded?.updatedAt).toBeGreaterThanOrEqual(before)
    })

    it('does nothing when session does not exist', () => {
        expect(() => updateSessionProgress('missing-fp', 100)).not.toThrow()
    })

    it('silently ignores localStorage errors', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage error')
        })
        expect(() => updateSessionProgress('fp', 100)).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// removeSession
// ─────────────────────────────────────────────
describe('removeSession', () => {
    it('removes the session from localStorage', () => {
        const fp = 'to-remove'
        saveSession(fp, makeSession())
        removeSession(fp)
        expect(loadSession(fp)).toBeNull()
    })

    it('does not throw when session does not exist', () => {
        expect(() => removeSession('nonexistent')).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// clearAllSessions
// ─────────────────────────────────────────────
describe('clearAllSessions', () => {
    it('removes all upup_mp_ keys', () => {
        saveSession('fp1', makeSession({ uploadId: 'u1' }))
        saveSession('fp2', makeSession({ uploadId: 'u2' }))
        saveSession('fp3', makeSession({ uploadId: 'u3' }))
        clearAllSessions()
        expect(loadSession('fp1')).toBeNull()
        expect(loadSession('fp2')).toBeNull()
        expect(loadSession('fp3')).toBeNull()
    })

    it('does not remove unrelated keys', () => {
        localStorage.setItem('my-app-key', 'should-remain')
        saveSession('fp1', makeSession())
        clearAllSessions()
        expect(localStorage.getItem('my-app-key')).toBe('should-remain')
    })

    it('does not throw when localStorage is empty', () => {
        expect(() => clearAllSessions()).not.toThrow()
    })
})
