import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upupjs/core'
import type { UploadFile } from '../src/contracts'

const makeNativeFile = (
    name = 'test.jpg',
    size = 1024,
    type = 'image/jpeg',
): File => {
    return new File(['x'.repeat(size)], name, { type })
}

describe('UpupCore', () => {
    it('initializes with IDLE status', () => {
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/upload',
        })
        expect(core.status).toBe(UploadStatus.IDLE)
    })

    it('adds files and emits files-added event', async () => {
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/upload',
        })
        const handler = vi.fn()
        core.on('files-added', handler)
        await core.addFiles([makeNativeFile()])
        expect(core.files.size).toBe(1)
        expect(handler).toHaveBeenCalled()
    })

    it('removes a file and emits file-removed', () => {
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/upload',
        })
        const handler = vi.fn()
        core.on('file-removed', handler)
        // Minimal test fixture — only `id`/`name` are exercised by removeFile/size assertions.
        const file = { id: 'test-1', name: 'test.jpg' } as unknown as UploadFile
        core['fileManager']['files'].set('test-1', file)
        core.removeFile('test-1')
        expect(core.files.size).toBe(0)
        expect(handler).toHaveBeenCalled()
    })

    it('emits file-rejected when onBeforeFileAdded returns false', async () => {
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/upload',
            onBeforeFileAdded: async () => false,
        })
        const handler = vi.fn()
        core.on('file-rejected', handler)
        await core.addFiles([makeNativeFile()])
        expect(core.files.size).toBe(0)
    })

    // The plugin registration cases that lived here (use()-chaining + the
    // init(emitter) shape, options.plugins, and destroy cleanup) are pinned by
    // plugin-extended.test.ts — its F-607 block asserts the emitter exposes
    // both on AND emit, its options.plugins block additionally proves
    // constructor and use() plugins coexist in order, and core-destroy-
    // lifecycle.test.ts owns destroy. Extension access stays below because
    // this is the only place registerExtension is called directly on the core
    // rather than from inside a plugin's init.
    it('provides type-safe extension access via ext', () => {
        const core = new UpupCore({
            provider: 'aws',
            uploadEndpoint: '/api/upload',
        })
        core.registerExtension('counter', { getCount: () => 42 })
        expect(core.getExtension('counter')!.getCount!()).toBe(42)
    })
})
