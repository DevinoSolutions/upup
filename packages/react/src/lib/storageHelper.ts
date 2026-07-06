// storageHelper.ts
/* Toggle Base64 encoding/decoding (simple “encryption”) */
const ENCRYPTION = true

type SecureStorageAPI = {
    setItem: (key: string, value: string) => void
    getItem: (key: string) => string | null
    removeItem: (key: string) => void
    clear: (keys: string[]) => void
}

let instance: SecureStorageAPI | null = null

export const createSecureStorage = (): SecureStorageAPI => {
    if (instance) return instance

    /* Encode/decode respect the ENCRYPTION flag */
    const encode = (str: string) => (ENCRYPTION ? btoa(str) : str)
    const decode = (str: string) => {
        if (!ENCRYPTION) return str
        try {
            return atob(str)
        } catch {
            // upup-catch: not valid base64 (e.g. legacy plaintext) — return as-is
            return str
        }
    }

    const keyFor = (rawKey: string) => encode(`k:${rawKey}`)

    const wrap = (value: string) =>
        JSON.stringify({ value, timestamp: Date.now() })

    const isExpired = (ts: number) => Date.now() - ts > 30 * 24 * 60 * 60 * 1000 // 30 days

    instance = {
        setItem: (key, value) => {
            try {
                const storeKey = keyFor(key)
                const encrypted = encode(wrap(value))
                localStorage.setItem(storeKey, encrypted)
            } catch (err) {
                // upup-catch: encode/quota failure — degrade to an unencrypted
                // plaintext write so the token still persists
                console.error('secureStorage setItem error:', err)
                localStorage.setItem(key, value) // fallback
            }
        },

        getItem: key => {
            const storeKey = keyFor(key)

            let stored = localStorage.getItem(storeKey)

            if (!stored) stored = localStorage.getItem(key)
            if (!stored) return null

            const decrypted = decode(stored)

            try {
                const { value, timestamp } = JSON.parse(decrypted) as {
                    value?: string
                    timestamp?: number
                }
                if (value && timestamp && !isExpired(timestamp)) return value
                if (value) {
                    localStorage.removeItem(storeKey)
                    localStorage.removeItem(key)
                }
            } catch {
                // upup-catch: stored value predates the JSON envelope — return the raw decoded string
                return decrypted
            }
            return null
        },

        removeItem: key => {
            localStorage.removeItem(keyFor(key))
            localStorage.removeItem(key) // legacy
        },

        clear: keys => {
            keys.forEach(k => {
                localStorage.removeItem(keyFor(k))
                localStorage.removeItem(k)
            })
        },
    }

    return instance
}
