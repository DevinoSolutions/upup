import { describe, it, expect } from 'vitest'

// Test endpoint resolution for the v2-clean targets. Managed apiKey inference was removed.
function resolveEndpoint(opts: {
    uploadEndpoint?: string
    serverUrl?: string
}): string {
    return (
        opts.uploadEndpoint ??
        (opts.serverUrl ? `${opts.serverUrl.replace(/\/$/, '')}/presign` : '')
    )
}

describe('endpoint resolution', () => {
    it('uploadEndpoint takes highest priority', () => {
        expect(
            resolveEndpoint({
                uploadEndpoint: '/api/upload',
                serverUrl: '/api/server',
            }),
        ).toBe('/api/upload')
    })

    it('serverUrl appends /presign', () => {
        expect(
            resolveEndpoint({
                serverUrl: '/api/upup',
            }),
        ).toBe('/api/upup/presign')
    })

    it('returns empty string when nothing provided', () => {
        expect(resolveEndpoint({})).toBe('')
    })

    it('normalizes trailing slash on serverUrl', () => {
        expect(
            resolveEndpoint({
                serverUrl: '/my/server/',
            }),
        ).toBe('/my/server/presign')
    })
})
