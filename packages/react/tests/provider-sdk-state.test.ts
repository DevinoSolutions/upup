import { describe, it, expect } from 'vitest'
import { ProviderSDK } from '../src/lib/storage/provider'
import { UpupProvider } from '../src/shared/types'

function makeSdk(overrides: Record<string, unknown> = {}) {
    return new ProviderSDK({
        provider: UpupProvider.AWS,
        tokenEndpoint: 'https://example.com/token',
        enableAutoCorsConfig: false,
        ...overrides,
    } as any)
}

// ─────────────────────────────────────────────
// isPaused getter
// ─────────────────────────────────────────────
describe('ProviderSDK — isPaused', () => {
    it('is false on construction', () => {
        expect(makeSdk().isPaused).toBe(false)
    })

    it('is true after pause()', () => {
        const sdk = makeSdk()
        sdk.pause()
        expect(sdk.isPaused).toBe(true)
    })

    it('is false after resume()', () => {
        const sdk = makeSdk()
        sdk.pause()
        sdk.resume()
        expect(sdk.isPaused).toBe(false)
    })
})

// ─────────────────────────────────────────────
// pause()
// ─────────────────────────────────────────────
describe('ProviderSDK — pause()', () => {
    it('sets isPaused to true', () => {
        const sdk = makeSdk()
        sdk.pause()
        expect(sdk.isPaused).toBe(true)
    })

    it('is idempotent — calling pause twice stays paused', () => {
        const sdk = makeSdk()
        sdk.pause()
        sdk.pause()
        expect(sdk.isPaused).toBe(true)
    })
})

// ─────────────────────────────────────────────
// resume()
// ─────────────────────────────────────────────
describe('ProviderSDK — resume()', () => {
    it('sets isPaused to false after being paused', () => {
        const sdk = makeSdk()
        sdk.pause()
        sdk.resume()
        expect(sdk.isPaused).toBe(false)
    })

    it('is a no-op when not paused', () => {
        const sdk = makeSdk()
        expect(() => sdk.resume()).not.toThrow()
        expect(sdk.isPaused).toBe(false)
    })

    it('is idempotent — calling resume twice stays unpaused', () => {
        const sdk = makeSdk()
        sdk.pause()
        sdk.resume()
        sdk.resume()
        expect(sdk.isPaused).toBe(false)
    })

    it('can pause again after resume', () => {
        const sdk = makeSdk()
        sdk.pause()
        sdk.resume()
        sdk.pause()
        expect(sdk.isPaused).toBe(true)
    })
})

// ─────────────────────────────────────────────
// abort()
// ─────────────────────────────────────────────
describe('ProviderSDK — abort()', () => {
    it('does not throw when no XHR is in flight', () => {
        const sdk = makeSdk()
        expect(() => sdk.abort()).not.toThrow()
    })

    it('can be called multiple times without throwing', () => {
        const sdk = makeSdk()
        sdk.abort()
        sdk.abort()
    })
})

// ─────────────────────────────────────────────
// pause + resume interaction with isPaused
// ─────────────────────────────────────────────
describe('ProviderSDK — pause/resume cycle', () => {
    it('toggle sequence correctly tracks state', () => {
        const sdk = makeSdk()
        expect(sdk.isPaused).toBe(false)
        sdk.pause()
        expect(sdk.isPaused).toBe(true)
        sdk.resume()
        expect(sdk.isPaused).toBe(false)
        sdk.pause()
        expect(sdk.isPaused).toBe(true)
        sdk.resume()
        expect(sdk.isPaused).toBe(false)
    })
})
