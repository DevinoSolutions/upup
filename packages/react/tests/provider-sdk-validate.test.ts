import { describe, it, expect } from 'vitest'
import { ProviderSDK } from '../src/lib/storage/provider'
import { UpupProvider } from '../src/shared/types'

function makeConfig(overrides: Record<string, unknown> = {}) {
    return {
        provider: UpupProvider.AWS,
        tokenEndpoint: 'https://example.com/token',
        enableAutoCorsConfig: false,
        ...overrides,
    } as any
}

// ─────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────
describe('ProviderSDK.validateConfig() — happy path', () => {
    it('returns true for a minimal valid config', () => {
        const sdk = new ProviderSDK(makeConfig())
        expect(sdk.validateConfig()).toBe(true)
    })

    it('accepts all known UpupProvider values', () => {
        for (const provider of Object.values(UpupProvider)) {
            const sdk = new ProviderSDK(makeConfig({ provider }))
            expect(sdk.validateConfig()).toBe(true)
        }
    })

    it('accepts valid wildcard accept string', () => {
        const sdk = new ProviderSDK(
            makeConfig({ constraints: { multiple: true, accept: '*/*' } }),
        )
        expect(sdk.validateConfig()).toBe(true)
    })

    it('accepts valid mime-type accept string', () => {
        const sdk = new ProviderSDK(
            makeConfig({ constraints: { multiple: true, accept: 'image/png,video/mp4' } }),
        )
        expect(sdk.validateConfig()).toBe(true)
    })

    it('accepts valid extension accept string', () => {
        const sdk = new ProviderSDK(
            makeConfig({ constraints: { multiple: true, accept: '.pdf,.docx' } }),
        )
        expect(sdk.validateConfig()).toBe(true)
    })
})

// ─────────────────────────────────────────────
// Missing required fields
// ─────────────────────────────────────────────
describe('ProviderSDK.validateConfig() — missing required fields', () => {
    it('throws when tokenEndpoint is missing', () => {
        expect(() => new ProviderSDK(makeConfig({ tokenEndpoint: '' }))).toThrow()
    })

    it('throws when provider is missing', () => {
        expect(() => new ProviderSDK(makeConfig({ provider: '' }))).toThrow()
    })

    it('error message mentions the missing field name', () => {
        expect(() => new ProviderSDK(makeConfig({ tokenEndpoint: '' }))).toThrow(
            /tokenEndpoint/,
        )
    })
})

// ─────────────────────────────────────────────
// Invalid provider enum
// ─────────────────────────────────────────────
describe('ProviderSDK.validateConfig() — invalid provider', () => {
    it('throws for an unknown provider string', () => {
        expect(() => new ProviderSDK(makeConfig({ provider: 'FAKE_CLOUD' }))).toThrow()
    })

    it('error message mentions the invalid provider value', () => {
        expect(() => new ProviderSDK(makeConfig({ provider: 'FAKE_CLOUD' }))).toThrow(
            /FAKE_CLOUD/,
        )
    })
})

// ─────────────────────────────────────────────
// Invalid tokenEndpoint URL
// ─────────────────────────────────────────────
describe('ProviderSDK.validateConfig() — invalid tokenEndpoint', () => {
    it('throws for a relative path', () => {
        expect(() =>
            new ProviderSDK(makeConfig({ tokenEndpoint: '/api/token' })),
        ).toThrow()
    })

    it('throws for a plain string with no protocol', () => {
        expect(() =>
            new ProviderSDK(makeConfig({ tokenEndpoint: 'not-a-url' })),
        ).toThrow()
    })

    it('error message mentions the invalid tokenEndpoint value', () => {
        // provider must be valid so URL validation is reached
        expect(() =>
            new ProviderSDK(makeConfig({ provider: UpupProvider.AWS, tokenEndpoint: 'not-a-url' })),
        ).toThrow(/not-a-url/)
    })
})

// ─────────────────────────────────────────────
// Tus mode rejection
// ─────────────────────────────────────────────
describe('ProviderSDK.validateConfig() — tus mode', () => {
    it('throws when resumable.mode is "tus"', () => {
        expect(() =>
            new ProviderSDK(makeConfig({ provider: UpupProvider.AWS, resumable: { mode: 'tus' } })),
        ).toThrow(/[Tt]us/)
    })
})

// ─────────────────────────────────────────────
// Invalid constraints
// ─────────────────────────────────────────────
describe('ProviderSDK.validateConfig() — constraints', () => {
    it('throws when maxFileSize is 0', () => {
        expect(() =>
            new ProviderSDK(
                makeConfig({ constraints: { multiple: true, accept: '*', maxFileSize: 0 } }),
            ),
        ).toThrow()
    })

    it('throws when maxFileSize is negative', () => {
        expect(() =>
            new ProviderSDK(
                makeConfig({ constraints: { multiple: true, accept: '*', maxFileSize: -1 } }),
            ),
        ).toThrow()
    })

    it('throws for a malformed accept string', () => {
        expect(() =>
            new ProviderSDK(
                makeConfig({ constraints: { multiple: true, accept: 'bad accept!!', maxFileSize: 0 } }),
            ),
        ).toThrow()
    })
})
