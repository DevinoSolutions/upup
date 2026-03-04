/**
 * @jest-environment jsdom
 */
import {
    clearAllSessions,
    fileFingerprint,
    loadSession,
    MultipartSession,
    removeSession,
    saveSession,
} from '../../frontend/lib/resumable/multipartSessionStore'
import { UpupProvider } from '../../shared/types'

describe('multipartSessionStore', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    describe('fileFingerprint', () => {
        it('generates a deterministic fingerprint', () => {
            const file = new File(['hello'], 'test.txt', {
                type: 'text/plain',
                lastModified: 1700000000000,
            })
            const fp = fileFingerprint(file)
            expect(fp).toBe(`test.txt:${file.size}:1700000000000:text/plain`)
        })

        it('returns the same fingerprint for identical files', () => {
            const file1 = new File(['hello'], 'test.txt', {
                type: 'text/plain',
                lastModified: 1700000000000,
            })
            const file2 = new File(['hello'], 'test.txt', {
                type: 'text/plain',
                lastModified: 1700000000000,
            })
            expect(fileFingerprint(file1)).toBe(fileFingerprint(file2))
        })

        it('returns different fingerprints for different files', () => {
            const file1 = new File(['hello'], 'a.txt', {
                type: 'text/plain',
                lastModified: 1700000000000,
            })
            const file2 = new File(['world'], 'b.txt', {
                type: 'text/plain',
                lastModified: 1700000000001,
            })
            expect(fileFingerprint(file1)).not.toBe(fileFingerprint(file2))
        })
    })

    describe('saveSession / loadSession', () => {
        const session: MultipartSession = {
            provider: UpupProvider.AWS,
            key: 'uploads/test.txt',
            uploadId: 'abc123',
            partSize: 5 * 1024 * 1024,
            updatedAt: Date.now(),
        }

        it('saves and loads a session', () => {
            saveSession('fp1', session)
            const loaded = loadSession('fp1')
            expect(loaded).toEqual(session)
        })

        it('returns null for non-existent fingerprint', () => {
            expect(loadSession('nonexistent')).toBeNull()
        })

        it('expires sessions older than 24 hours', () => {
            const oldSession: MultipartSession = {
                ...session,
                updatedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
            }
            saveSession('fp-old', oldSession)
            expect(loadSession('fp-old')).toBeNull()
        })

        it('keeps sessions within the 24 hour window', () => {
            const recentSession: MultipartSession = {
                ...session,
                updatedAt: Date.now() - 23 * 60 * 60 * 1000, // 23 hours ago
            }
            saveSession('fp-recent', recentSession)
            expect(loadSession('fp-recent')).toEqual(recentSession)
        })
    })

    describe('removeSession', () => {
        it('removes a session', () => {
            const session: MultipartSession = {
                provider: UpupProvider.AWS,
                key: 'uploads/test.txt',
                uploadId: 'abc123',
                partSize: 5 * 1024 * 1024,
                updatedAt: Date.now(),
            }
            saveSession('fp-rm', session)
            expect(loadSession('fp-rm')).toEqual(session)
            removeSession('fp-rm')
            expect(loadSession('fp-rm')).toBeNull()
        })
    })

    describe('clearAllSessions', () => {
        it('removes all upup_mp_ prefixed sessions', () => {
            const session: MultipartSession = {
                provider: UpupProvider.AWS,
                key: 'uploads/test.txt',
                uploadId: 'abc123',
                partSize: 5 * 1024 * 1024,
                updatedAt: Date.now(),
            }
            saveSession('fp-a', session)
            saveSession('fp-b', session)
            // Add a non-upup key to verify it's not removed
            localStorage.setItem('other_key', 'value')

            clearAllSessions()

            expect(loadSession('fp-a')).toBeNull()
            expect(loadSession('fp-b')).toBeNull()
            expect(localStorage.getItem('other_key')).toBe('value')
        })
    })
})
