import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '@useupup/core'
import { UploadStatus } from '@useupup/core'

describe('UpupCore.updateOptions', () => {
    it('updates accept option', () => {
        const core = new UpupCore({
            uploadEndpoint: '/test',
            allowedFileTypes: 'image/*',
        })
        expect(core.options.allowedFileTypes).toBe('image/*')

        core.updateOptions({ allowedFileTypes: '.pdf,.doc' })
        expect(core.options.allowedFileTypes).toBe('.pdf,.doc')
    })

    it('updates limit option', () => {
        const core = new UpupCore({ uploadEndpoint: '/test', limit: 5 })
        expect(core.options.limit).toBe(5)

        core.updateOptions({ limit: 10 })
        expect(core.options.limit).toBe(10)
    })

    it('updates maxRetries option', () => {
        const core = new UpupCore({ uploadEndpoint: '/test', maxRetries: 3 })
        core.updateOptions({ maxRetries: 5 })
        expect(core.options.maxRetries).toBe(5)
    })

    it('updates uploadEndpoint', () => {
        const core = new UpupCore({ uploadEndpoint: '/old' })
        core.updateOptions({ uploadEndpoint: '/new' })
        expect(core.options.uploadEndpoint).toBe('/new')
    })

    it('preserves existing options when updating partial', () => {
        const core = new UpupCore({
            uploadEndpoint: '/test',
            allowedFileTypes: 'image/*',
            limit: 5,
            maxRetries: 3,
        })

        core.updateOptions({ limit: 10 })

        expect(core.options.uploadEndpoint).toBe('/test')
        expect(core.options.allowedFileTypes).toBe('image/*')
        expect(core.options.limit).toBe(10)
        expect(core.options.maxRetries).toBe(3)
    })

    it('updates onBeforeFileAdded callback', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        const hook = vi.fn().mockReturnValue(true)

        core.updateOptions({ onBeforeFileAdded: hook })
        expect(core.options.onBeforeFileAdded).toBe(hook)
    })
})

describe('UpupCore lifecycle', () => {
    it('starts with IDLE status', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        expect(core.status).toBe(UploadStatus.IDLE)
    })

    it('starts with empty files', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        expect(core.files.size).toBe(0)
    })

    it('starts with zero progress', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        const progress = core.progress
        expect(progress.totalFiles).toBe(0)
        expect(progress.completedFiles).toBe(0)
        expect(progress.percentage).toBe(0)
    })

    it('starts with no error', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        expect(core.error).toBeNull()
    })

    it('destroy clears all state', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        const handler = vi.fn()
        core.on('state-change', handler)

        core.destroy()

        // After destroy, emitting should not call handler
        core.emit('state-change', {})
        expect(handler).not.toHaveBeenCalled()
        expect(core.files.size).toBe(0)
    })

    it('getSnapshot returns current state', () => {
        const core = new UpupCore({ uploadEndpoint: '/test' })
        const snapshot = core.getSnapshot()
        expect(snapshot.status).toBe(UploadStatus.IDLE)
        expect(snapshot.files).toEqual([])
    })

    it('does not infer hosted serverUrl from apiKey-like legacy input', () => {
        const core = new UpupCore({
            apiKey: 'test-key',
        } as unknown as ConstructorParameters<typeof UpupCore>[0])
        expect(core.options.serverUrl).toBeUndefined()
    })

    it('keeps explicit serverUrl when legacy apiKey-like input is present', () => {
        const core = new UpupCore({
            apiKey: 'test-key',
            serverUrl: 'https://custom.api',
        } as unknown as ConstructorParameters<typeof UpupCore>[0])
        expect(core.options.serverUrl).toBe('https://custom.api')
    })
})
