import { describe, it, expect } from 'vitest'
import type { TokenStore } from '../src/config'
import { setTokens } from '../src/tokenStore'

// Fake store that records every set() call for inspection
interface SetCall {
    key: string
    value: string
    ttlSeconds: number | undefined
}

function makeFakeStore(): { store: TokenStore; calls: SetCall[] } {
    const calls: SetCall[] = []
    const store: TokenStore = {
        async get(_key: string) {
            return null
        },
        async set(key: string, value: string, ttlSeconds?: number) {
            calls.push({ key, value, ttlSeconds })
        },
        async delete(_key: string) {},
    }
    return { store, calls }
}

describe('setTokens — refresh-aware TTL (audit S8)', () => {
    it('stores WITHOUT expiry when refreshToken is present (blob must outlive access token)', async () => {
        const { store, calls } = makeFakeStore()
        await setTokens(store, 'u', 'google-drive', {
            accessToken: 'a',
            expiresAt: Date.now() + 3_600_000,
            refreshToken: 'r',
        })
        expect(calls).toHaveLength(1)
        expect(calls[0]!.ttlSeconds).toBeUndefined()
    })

    it('stores WITH expiry derived from expiresAt when NO refreshToken', async () => {
        const { store, calls } = makeFakeStore()
        await setTokens(store, 'u', 'google-drive', {
            accessToken: 'a',
            expiresAt: Date.now() + 3_600_000,
        })
        expect(calls).toHaveLength(1)
        const ttl = calls[0]!.ttlSeconds
        expect(typeof ttl).toBe('number')
        // Allow a small tolerance for compute time (±6 s)
        expect(ttl).toBeGreaterThanOrEqual(3594)
        expect(ttl).toBeLessThanOrEqual(3601)
    })

    it('stores WITHOUT expiry when no expiresAt and no refreshToken', async () => {
        const { store, calls } = makeFakeStore()
        await setTokens(store, 'u', 'google-drive', {
            accessToken: 'a',
        })
        expect(calls).toHaveLength(1)
        expect(calls[0]!.ttlSeconds).toBeUndefined()
    })

    it('round-trips the token object via JSON', async () => {
        const tokens = {
            accessToken: 'tok',
            expiresAt: 9999999,
            scope: 'drive.readonly',
            tokenType: 'Bearer',
            refreshToken: 'ref',
        }
        const { store, calls } = makeFakeStore()
        await setTokens(store, 'u', 'google-drive', tokens)
        expect(calls).toHaveLength(1)
        expect(JSON.parse(calls[0]!.value)).toEqual(tokens)
    })
})
