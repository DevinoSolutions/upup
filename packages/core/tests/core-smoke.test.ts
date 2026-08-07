import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upupjs/core'

/**
 * Constructor smoke tests only.
 *
 * This file used to walk the whole UpupCore surface (file ops, upload
 * controls, options, snapshot, events, plugins, progress, destroy). Every one
 * of those behaviors now has a dedicated suite that asserts it harder than a
 * smoke pass could — core-file-ops / core-file-events / file-manager-reorder,
 * core-upload-controls / core-status-transitions, core-options-sync,
 * core-restore / core-snapshot-extended, core-event-emitter-on-off-and-getter-
 * mechanics (which pins progress at 0/50/100%), plugin / plugin-extended /
 * plugin-integration, core-destroy-lifecycle, and validate-files — so the walk
 * was re-asserting covered ground.
 *
 * What is NOT covered elsewhere is construction itself: that both a bare and a
 * fully-populated options object yield a sane initial state. That is what
 * stays here.
 */
describe('UpupCore — constructor smoke tests', () => {
    it('constructs with minimal options', () => {
        const core = new UpupCore({})
        expect(core).toBeDefined()
        expect(core.status).toBe(UploadStatus.IDLE)
        expect(core.files.size).toBe(0)
        expect(core.error).toBeNull()
        expect(core.progress.percentage).toBe(0)
        core.destroy()
    })

    it('constructs with full options', () => {
        const core = new UpupCore({
            provider: 'aws',
            serverUrl: 'https://api.test',
            allowedFileTypes: 'image/*',
            limit: 5,
            maxFileSize: { size: 10, unit: 'MB' },
            minFileSize: { size: 1, unit: 'KB' },
            maxRetries: 3,
            autoUpload: false,
            maxConcurrentUploads: 2,
        })
        expect(core.options.provider).toBe('aws')
        expect(core.options.limit).toBe(5)
        core.destroy()
    })
})
