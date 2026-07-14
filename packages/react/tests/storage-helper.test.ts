import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSecureStorage } from '../src/lib/storageHelper'

beforeEach(() => {
    localStorage.clear()
})

afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
})

// ─────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────
describe('createSecureStorage — singleton', () => {
    it('returns the same instance on multiple calls', () => {
        const a = createSecureStorage()
        const b = createSecureStorage()
        expect(a).toBe(b)
    })

    it('returns an object with the required API', () => {
        const storage = createSecureStorage()
        expect(typeof storage.setItem).toBe('function')
        expect(typeof storage.getItem).toBe('function')
        expect(typeof storage.removeItem).toBe('function')
        expect(typeof storage.clear).toBe('function')
    })
})

// ─────────────────────────────────────────────
// setItem / getItem round-trip
// ─────────────────────────────────────────────
describe('createSecureStorage — setItem / getItem', () => {
    it('stores and retrieves a value', () => {
        const storage = createSecureStorage()
        storage.setItem('token', 'abc123')
        expect(storage.getItem('token')).toBe('abc123')
    })

    it('stores and retrieves a JSON string value', () => {
        const storage = createSecureStorage()
        const json = JSON.stringify({ userId: 42 })
        storage.setItem('user', json)
        expect(storage.getItem('user')).toBe(json)
    })

    it('returns null for a key that was never set', () => {
        const storage = createSecureStorage()
        expect(storage.getItem('nonexistent-key-xyz')).toBeNull()
    })

    it('encodes the key (raw key not present in localStorage)', () => {
        const storage = createSecureStorage()
        storage.setItem('myKey', 'myValue')
        // The raw key should NOT appear in localStorage directly
        expect(localStorage.getItem('myKey')).toBeNull()
    })

    it('stores the value encoded (raw value not visible)', () => {
        const storage = createSecureStorage()
        storage.setItem('secret', 'plaintext')
        // Check all localStorage values — none should equal 'plaintext'
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!
            expect(localStorage.getItem(k)).not.toBe('plaintext')
        }
    })

    it('overwrites a previously set value', () => {
        const storage = createSecureStorage()
        storage.setItem('key', 'first')
        storage.setItem('key', 'second')
        expect(storage.getItem('key')).toBe('second')
    })
})

// ─────────────────────────────────────────────
// Expiry
// ─────────────────────────────────────────────
describe('createSecureStorage — expiry', () => {
    it('returns null for items older than 30 days', () => {
        const storage = createSecureStorage()
        // Manually inject an expired entry by bypassing setItem
        const oldTs = Date.now() - 31 * 24 * 60 * 60 * 1000
        const payload = btoa(
            JSON.stringify({ value: 'stale', timestamp: oldTs }),
        )
        const encodedKey = btoa('k:expiredKey')
        localStorage.setItem(encodedKey, payload)
        expect(storage.getItem('expiredKey')).toBeNull()
    })

    it('returns value for items within 30 days', () => {
        const storage = createSecureStorage()
        storage.setItem('fresh', 'freshValue')
        expect(storage.getItem('fresh')).toBe('freshValue')
    })
})

// ─────────────────────────────────────────────
// removeItem
// ─────────────────────────────────────────────
describe('createSecureStorage — removeItem', () => {
    it('removes a stored item so getItem returns null', () => {
        const storage = createSecureStorage()
        storage.setItem('toRemove', 'value')
        storage.removeItem('toRemove')
        expect(storage.getItem('toRemove')).toBeNull()
    })

    it('does not throw when removing a non-existent key', () => {
        const storage = createSecureStorage()
        expect(() => storage.removeItem('ghost-key')).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// clear
// ─────────────────────────────────────────────
describe('createSecureStorage — clear', () => {
    it('removes all specified keys', () => {
        const storage = createSecureStorage()
        storage.setItem('k1', 'v1')
        storage.setItem('k2', 'v2')
        storage.setItem('k3', 'v3')
        storage.clear(['k1', 'k2', 'k3'])
        expect(storage.getItem('k1')).toBeNull()
        expect(storage.getItem('k2')).toBeNull()
        expect(storage.getItem('k3')).toBeNull()
    })

    it('does not affect keys not in the list', () => {
        const storage = createSecureStorage()
        storage.setItem('keep', 'keepValue')
        storage.setItem('remove', 'removeValue')
        storage.clear(['remove'])
        expect(storage.getItem('keep')).toBe('keepValue')
    })

    it('does not throw when clearing an empty list', () => {
        const storage = createSecureStorage()
        expect(() => storage.clear([])).not.toThrow()
    })
})
