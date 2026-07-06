// ── Storage helpers (guarded for SSR) ──

export function storageGet(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
        return sessionStorage.getItem(key)
    } catch {
        // upup-catch: sessionStorage may be unavailable (private mode) or throw on access; best-effort read
        return null
    }
}

export function storageSet(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.setItem(key, value)
    } catch {
        // upup-catch: quota exceeded or private browsing — best-effort write, safe to drop
    }
}

export function storageDel(key: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.removeItem(key)
    } catch {
        // upup-catch: sessionStorage may be unavailable (private mode); best-effort cleanup
    }
}
