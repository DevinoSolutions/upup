import type { StorageProvider } from '@upup/core'

export interface MultipartSession {
    provider: StorageProvider | string
    key: string
    uploadId: string
    partSize: number
    updatedAt: number
    /** Bytes uploaded so far (used for progress pre-population on resume) */
    uploadedBytes?: number
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
 * Load a multipart session from localStorage, if it exists and is not expired.
 */
export function loadSession(fingerprint: string): MultipartSession | null {
    try {
        const raw = localStorage.getItem(storageKey(fingerprint))
        if (!raw) return null

        const session: MultipartSession = JSON.parse(raw)

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
