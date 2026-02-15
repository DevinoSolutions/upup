import { UpupProvider } from '../../../shared/types'

export interface MultipartSession {
    provider: UpupProvider
    key: string
    uploadId: string
    partSize: number
    updatedAt: number
}

const STORAGE_PREFIX = 'upup_mp_'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Generate a deterministic fingerprint for a file to identify resumable sessions.
 */
export function fileFingerprint(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}:${file.type}`
}

function storageKey(fingerprint: string): string {
    return `${STORAGE_PREFIX}${fingerprint}`
}

/**
 * Save a multipart session to localStorage.
 */
export function saveSession(
    fingerprint: string,
    session: MultipartSession,
): void {
    try {
        localStorage.setItem(storageKey(fingerprint), JSON.stringify(session))
    } catch {
        // localStorage may be unavailable; silently ignore
    }
}

/**
 * Load a multipart session from localStorage, if it exists and is not expired.
 */
export function loadSession(fingerprint: string): MultipartSession | null {
    try {
        const raw = localStorage.getItem(storageKey(fingerprint))
        if (!raw) return null

        const session: MultipartSession = JSON.parse(raw)

        // Expire stale sessions
        if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
            removeSession(fingerprint)
            return null
        }

        return session
    } catch {
        return null
    }
}

/**
 * Remove a multipart session (on complete or abort).
 */
export function removeSession(fingerprint: string): void {
    try {
        localStorage.removeItem(storageKey(fingerprint))
    } catch {
        // silently ignore
    }
}

/**
 * Clear all multipart sessions (e.g., on user cancel).
 */
export function clearAllSessions(): void {
    try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key)
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch {
        // silently ignore
    }
}
