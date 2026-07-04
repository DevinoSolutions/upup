// ── Storage helpers (guarded for SSR) ──

export function storageGet(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
        return sessionStorage.getItem(key)
    } catch {
        return null
    }
}

export function storageSet(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.setItem(key, value)
    } catch {
        // quota exceeded or private browsing — silently ignore
    }
}

export function storageDel(key: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.removeItem(key)
    } catch {
        // ignore
    }
}
