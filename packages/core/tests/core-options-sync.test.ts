import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

describe('UpupCore — updateOptions sync behavior', () => {
    it('merges partial options without overwriting unrelated fields', () => {
        const core = new UpupCore({ provider: 'aws', maxRetries: 3 })
        core.updateOptions({ maxRetries: 5 })
        expect(core.options.maxRetries).toBe(5)
        expect(core.options.provider).toBe('aws')
        core.destroy()
    })

    it('syncs provider at runtime', () => {
        const core = new UpupCore({ provider: 'aws' })
        core.updateOptions({ provider: 'gcs' as any })
        expect(core.options.provider).toBe('gcs')
        core.destroy()
    })

    it('syncs serverUrl at runtime', () => {
        const core = new UpupCore({ serverUrl: 'https://old.api' })
        core.updateOptions({ serverUrl: 'https://new.api' })
        expect(core.options.serverUrl).toBe('https://new.api')
        core.destroy()
    })

    it('syncs apiKey at runtime', () => {
        const core = new UpupCore({ apiKey: 'old-key' })
        core.updateOptions({ apiKey: 'new-key' })
        expect(core.options.apiKey).toBe('new-key')
        core.destroy()
    })

    it('syncs autoUpload at runtime', () => {
        const core = new UpupCore({ autoUpload: false })
        core.updateOptions({ autoUpload: true })
        expect(core.options.autoUpload).toBe(true)
        core.destroy()
    })

    it('syncs accept at runtime', () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        core.updateOptions({ allowedFileTypes: 'text/plain,.pdf' })
        expect(core.options.allowedFileTypes).toBe('text/plain,.pdf')
        core.destroy()
    })

    it('syncs limit at runtime', () => {
        const core = new UpupCore({ limit: 5 })
        core.updateOptions({ limit: 10 })
        expect(core.options.limit).toBe(10)
        core.destroy()
    })

    it('syncs maxFileSize at runtime', () => {
        const core = new UpupCore({ maxFileSize: { size: 5, unit: 'MB' } })
        core.updateOptions({ maxFileSize: { size: 20, unit: 'MB' } })
        expect(core.options.maxFileSize).toEqual({ size: 20, unit: 'MB' })
        core.destroy()
    })

    it('emits options-updated with each sync call', () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('options-updated', handler)

        core.updateOptions({ maxRetries: 1 })
        core.updateOptions({ autoUpload: true })

        expect(handler).toHaveBeenCalledTimes(2)
        expect(handler).toHaveBeenNthCalledWith(1, { partial: { maxRetries: 1 } })
        expect(handler).toHaveBeenNthCalledWith(2, { partial: { autoUpload: true } })
        core.destroy()
    })

    it('syncing multiple fields at once works', () => {
        const core = new UpupCore({})
        core.updateOptions({
            provider: 'aws',
            serverUrl: 'https://api.test',
            apiKey: 'key-123',
            maxRetries: 5,
            autoUpload: true,
        })
        expect(core.options.provider).toBe('aws')
        expect(core.options.serverUrl).toBe('https://api.test')
        expect(core.options.apiKey).toBe('key-123')
        expect(core.options.maxRetries).toBe(5)
        expect(core.options.autoUpload).toBe(true)
        core.destroy()
    })
})
