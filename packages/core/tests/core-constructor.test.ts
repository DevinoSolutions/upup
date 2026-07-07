import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'
import type { CoreOptions } from '../src/options/types'

// `apiKey` was a legacy hosted-service option; it is not part of CoreOptions
// any more. These two casts simulate a caller still passing it, to prove core
// no longer special-cases that shape.
describe('UpupCore constructor — no implicit hosted apiKey URL', () => {
    it('does not set serverUrl from apiKey-like legacy input', () => {
        const core = new UpupCore({
            apiKey: 'key_123',
        } as unknown as CoreOptions)
        expect(core.options.serverUrl).toBeUndefined()
        core.destroy()
    })

    it('keeps an explicit serverUrl', () => {
        const core = new UpupCore({
            apiKey: 'key_123',
            serverUrl: 'https://custom.api',
        } as unknown as CoreOptions)
        expect(core.options.serverUrl).toBe('https://custom.api')
        core.destroy()
    })

    it('does not set serverUrl when apiKey is absent', () => {
        const core = new UpupCore({})
        expect(core.options.serverUrl).toBeUndefined()
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// flat option storage
// ─────────────────────────────────────────────
describe('UpupCore constructor — flat option storage', () => {
    it('stores the flat file-limit options as given', () => {
        const core = new UpupCore({
            limit: 5,
            maxFileSize: { size: 5, unit: 'MB' },
            minFileSize: { size: 1, unit: 'KB' },
            maxTotalFileSize: { size: 100, unit: 'MB' },
            allowedFileTypes: 'image/*,.pdf',
        })
        expect(core.options.limit).toBe(5)
        expect(core.options.maxFileSize).toEqual({ size: 5, unit: 'MB' })
        expect(core.options.minFileSize).toEqual({ size: 1, unit: 'KB' })
        expect(core.options.maxTotalFileSize).toEqual({ size: 100, unit: 'MB' })
        expect(core.options.allowedFileTypes).toBe('image/*,.pdf')
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// cloudDrives storage
// ─────────────────────────────────────────────
describe('UpupCore constructor — cloudDrives', () => {
    it('stores the camelCase cloudDrives config as-is (all four drives)', () => {
        const cloudDrives = {
            googleDrive: {
                clientId: 'gd-id',
                apiKey: 'gd-key',
                appId: 'gd-app',
            },
            oneDrive: {
                clientId: 'od-id',
                redirectUri: 'https://app.example/od',
            },
            dropbox: { clientId: 'db-id' },
            box: { clientId: 'bx-id', redirectUri: 'https://app.example/box' },
        }
        const core = new UpupCore({ cloudDrives })
        expect(core.options.cloudDrives).toEqual(cloudDrives)
        core.destroy()
    })
})
