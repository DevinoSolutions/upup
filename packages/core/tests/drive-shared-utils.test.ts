import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge } from '../src/drives/pkce'
import {
    storageGet,
    storageSet,
    storageDel,
} from '../src/drives/session-storage'
import { guessMimeType } from '../src/drives/mime'

describe('pkce', () => {
    it('generateCodeVerifier defaults to length 128', () => {
        expect(generateCodeVerifier()).toHaveLength(128)
    })

    it('generateCodeVerifier respects a custom length', () => {
        expect(generateCodeVerifier(43)).toHaveLength(43)
    })

    it('generateCodeVerifier only uses unreserved PKCE characters', () => {
        const verifier = generateCodeVerifier(256)
        expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
    })

    it('generateCodeChallenge is deterministic for the same input', async () => {
        const verifier = 'fixed-test-verifier-value'
        const a = await generateCodeChallenge(verifier)
        const b = await generateCodeChallenge(verifier)
        expect(a).toBe(b)
    })

    it('generateCodeChallenge is base64url (no +, /, =) and differs from the verifier', async () => {
        const verifier = 'fixed-test-verifier-value'
        const challenge = await generateCodeChallenge(verifier)
        expect(challenge).not.toMatch(/[+/=]/)
        expect(challenge).not.toBe(verifier)
    })
})

describe('session-storage', () => {
    const sessionStore = new Map<string, string>()

    const mockSessionStorage = {
        getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            sessionStore.set(key, value)
        }),
        removeItem: vi.fn((key: string) => {
            sessionStore.delete(key)
        }),
        clear: vi.fn(() => sessionStore.clear()),
        get length() {
            return sessionStore.size
        },
        key: vi.fn((_i: number) => null),
    }

    beforeEach(() => {
        sessionStore.clear()
        vi.stubGlobal('sessionStorage', mockSessionStorage)
        vi.stubGlobal('window', { location: { origin: 'https://example.com' } })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('round-trips a value through set/get/del', () => {
        storageSet('k', 'v')
        expect(storageGet('k')).toBe('v')
        storageDel('k')
        expect(storageGet('k')).toBeNull()
    })

    it('is SSR-safe when window is undefined', () => {
        vi.stubGlobal('window', undefined)
        expect(storageGet('k')).toBeNull()
        expect(() => storageSet('k', 'v')).not.toThrow()
        expect(() => storageDel('k')).not.toThrow()
    })

    it('swallows a sessionStorage.setItem failure', () => {
        vi.stubGlobal('sessionStorage', {
            ...mockSessionStorage,
            setItem: vi.fn(() => {
                throw new Error('quota exceeded')
            }),
        })
        expect(() => storageSet('k', 'v')).not.toThrow()
    })
})

describe('mime', () => {
    it('maps known extensions case-insensitively', () => {
        expect(guessMimeType('a.JPG')).toBe('image/jpeg')
    })

    it('maps a lowercase extension', () => {
        expect(guessMimeType('x.pdf')).toBe('application/pdf')
    })

    it('falls back to application/octet-stream for an unknown extension', () => {
        expect(guessMimeType('y.unknownext')).toBe('application/octet-stream')
    })

    it('falls back to application/octet-stream for an empty name', () => {
        expect(guessMimeType('')).toBe('application/octet-stream')
    })
})
