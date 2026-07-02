import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

// ─────────────────────────────────────────────
// Legacy hosted apiKey behavior
// ─────────────────────────────────────────────
describe('UpupCore constructor — no implicit hosted apiKey URL', () => {
    it('does not set serverUrl from apiKey-like legacy input', () => {
        const core = new UpupCore({ apiKey: 'key_123' } as any)
        expect(core.options.serverUrl).toBeUndefined()
        core.destroy()
    })

    it('keeps an explicit serverUrl', () => {
        const core = new UpupCore({ apiKey: 'key_123', serverUrl: 'https://custom.api' } as any)
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
// restrictions merging
// ─────────────────────────────────────────────
describe('UpupCore constructor — restrictions merging', () => {
    it('maps restrictions.maxFileSize to options.maxFileSize', () => {
        const core = new UpupCore({ restrictions: { maxFileSize: { size: 5, unit: 'MB' } } })
        expect(core.options.maxFileSize).toEqual({ size: 5, unit: 'MB' })
        core.destroy()
    })

    it('maps restrictions.minFileSize to options.minFileSize', () => {
        const core = new UpupCore({ restrictions: { minFileSize: { size: 1, unit: 'KB' } } })
        expect(core.options.minFileSize).toEqual({ size: 1, unit: 'KB' })
        core.destroy()
    })

    it('maps restrictions.maxTotalFileSize to options.maxTotalFileSize', () => {
        const core = new UpupCore({ restrictions: { maxTotalFileSize: { size: 100, unit: 'MB' } } })
        expect(core.options.maxTotalFileSize).toEqual({ size: 100, unit: 'MB' })
        core.destroy()
    })

    it('maps restrictions.maxNumberOfFiles to options.limit', () => {
        const core = new UpupCore({ restrictions: { maxNumberOfFiles: 10 } })
        expect(core.options.limit).toBe(10)
        core.destroy()
    })

    it('maps restrictions.minNumberOfFiles to options.minFiles', () => {
        const core = new UpupCore({ restrictions: { minNumberOfFiles: 2 } })
        expect(core.options.minFiles).toBe(2)
        core.destroy()
    })

    it('maps restrictions.allowedFileTypes to options.allowedFileTypes', () => {
        const core = new UpupCore({ restrictions: { allowedFileTypes: ['image/*', '.pdf'] } })
        expect(core.options.allowedFileTypes).toBe('image/*,.pdf')
        core.destroy()
    })

    it('flat options take precedence over restrictions', () => {
        const core = new UpupCore({
            restrictions: { maxNumberOfFiles: 20 },
            limit: 5,
        })
        expect(core.options.limit).toBe(5)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// cloudDrives storage
// ─────────────────────────────────────────────
describe('UpupCore constructor — cloudDrives', () => {
    it('stores the camelCase cloudDrives config as-is (all four drives)', () => {
        const cloudDrives = {
            googleDrive: { clientId: 'gd-id', apiKey: 'gd-key', appId: 'gd-app' },
            oneDrive: { clientId: 'od-id', redirectUri: 'https://app.example/od' },
            dropbox: { clientId: 'db-id' },
            box: { clientId: 'bx-id', redirectUri: 'https://app.example/box' },
        }
        const core = new UpupCore({ cloudDrives })
        expect(core.options.cloudDrives).toEqual(cloudDrives)
        core.destroy()
    })
})
