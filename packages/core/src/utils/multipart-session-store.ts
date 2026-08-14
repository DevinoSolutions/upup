/**
 * What a paused/reloaded multipart upload needs to find its way back to the
 * server-side upload it left behind. Deliberately NOT stored: the uploadId —
 * the HMAC-signed `token` is its only carrier (server-side S2), so a session
 * leaked out of localStorage still cannot forge a continuation request.
 */
export interface MultipartSession {
    /** The server-issued upload token: the sole carrier of key + uploadId +
     *  owner + size envelope. Replaced by a fresh one on every resume. */
    token: string
    /** Object key the upload targets — diagnostics only; the token is what the
     *  server actually binds against. */
    key: string
    /** Bytes per part for every part except the last one. Resume validates the
     *  server-reported part sizes against it before trusting the session. */
    partSize: number
    /** Epoch ms of the last write — drives the 24h TTL below. */
    updatedAt: number
    /** Bytes uploaded so far (used for progress pre-population on resume) */
    uploadedBytes?: number
    /** The serverUrl this session belongs to. A session saved against server A
     *  must never be resumed against server B. */
    scope?: string
    /** `file.metadata.originalContentHash`, when the checksum pipeline step
     *  ran. Opportunistic: compared on resume only when both sides have it. */
    contentHash?: string
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
        // upup-catch: localStorage may be unavailable (private mode/quota) — best-effort save
    }
}

/**
 * Load a multipart session from localStorage, if it exists and is not expired.
 */
export function loadSession(fingerprint: string): MultipartSession | null {
    try {
        const raw = localStorage.getItem(storageKey(fingerprint))
        if (!raw) return null

        const session = JSON.parse(raw) as MultipartSession

        // Expire stale sessions
        if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
            removeSession(fingerprint)
            return null
        }

        return session
    } catch {
        // upup-catch: corrupted/missing session data — treat as no resumable session
        return null
    }
}

/**
 * Update only the progress-related fields of an existing session.
 */
export function updateSessionProgress(
    fingerprint: string,
    uploadedBytes: number,
): void {
    try {
        const raw = localStorage.getItem(storageKey(fingerprint))
        if (!raw) return
        const session = JSON.parse(raw) as MultipartSession
        session.uploadedBytes = uploadedBytes
        session.updatedAt = Date.now()
        localStorage.setItem(storageKey(fingerprint), JSON.stringify(session))
    } catch {
        // upup-catch: localStorage may be unavailable — best-effort progress update
    }
}

/**
 * Swap in the freshly-issued token a resume (or a mid-flight token refresh)
 * returned, leaving the rest of the session untouched. Separate from
 * saveSession so a refresh racing three concurrent part uploaders cannot
 * clobber progress written between the load and the write.
 */
export function updateSessionToken(fingerprint: string, token: string): void {
    try {
        const raw = localStorage.getItem(storageKey(fingerprint))
        if (!raw) return
        const session = JSON.parse(raw) as MultipartSession
        session.token = token
        session.updatedAt = Date.now()
        localStorage.setItem(storageKey(fingerprint), JSON.stringify(session))
    } catch {
        // upup-catch: localStorage may be unavailable — best-effort token refresh
    }
}

/**
 * Remove a multipart session (on complete or abort).
 */
export function removeSession(fingerprint: string): void {
    try {
        localStorage.removeItem(storageKey(fingerprint))
    } catch {
        // upup-catch: localStorage may be unavailable — best-effort cleanup
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
        keysToRemove.forEach(k => {
            localStorage.removeItem(k)
        })
    } catch {
        // upup-catch: localStorage may be unavailable — best-effort bulk cleanup
    }
}
