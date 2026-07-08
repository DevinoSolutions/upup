import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'
import type { FileManager } from '@upup/core/internal'

const makeFile = (name: string, size = 10) =>
    new File(['x'.repeat(size)], name, { type: 'text/plain' })

/**
 * Test-only escape hatch: `pluginManager`/`fileManager` are private on
 * UpupCore. `registerExtension`'s production type (ExtensionMethods) expects
 * a record of functions, but these smoke tests intentionally probe with
 * plain data payloads, so `unknown` is used for that parameter here instead
 * of reusing the production type.
 */
type CoreInternals = {
    pluginManager: {
        registerExtension: (name: string, methods: unknown) => void
    }
    fileManager: FileManager
}
const internals = (core: UpupCore): CoreInternals =>
    core as unknown as CoreInternals

/**
 * Smoke tests: exercise the complete UpupCore public API surface
 * to verify no method throws unexpectedly and all return sane values.
 */
describe('UpupCore — smoke tests', () => {
    // ── Constructor ──
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

    // ── File operations ──
    it('addFiles → files getter → removeFile → removeAll', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        expect(core.files.size).toBe(2)

        const [firstId] = [...core.files.keys()]
        core.removeFile(firstId!)
        expect(core.files.size).toBe(1)

        core.removeAll()
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('setFiles replaces all', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('old.txt')])
        await core.setFiles([makeFile('new1.txt'), makeFile('new2.txt')])
        expect(core.files.size).toBe(2)
        core.destroy()
    })

    it('reorderFiles preserves count', async () => {
        const core = new UpupCore({})
        await core.addFiles([
            makeFile('a.txt'),
            makeFile('b.txt'),
            makeFile('c.txt'),
        ])
        const ids = [...core.files.keys()]
        core.reorderFiles([...ids].reverse())
        expect(core.files.size).toBe(3)
        expect([...core.files.keys()]).toEqual([...ids].reverse())
        core.destroy()
    })

    // ── Upload controls ──
    it('pause → resume → cancel cycle', () => {
        const core = new UpupCore({})
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.resume()
        expect(core.status).toBe(UploadStatus.UPLOADING)
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('retry emits without changing status', () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('retry', handler)
        core.retry('file-1')
        expect(handler).toHaveBeenCalledWith({ fileId: 'file-1' })
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    // ── Options ──
    it('updateOptions merges and emits', () => {
        const core = new UpupCore({ maxRetries: 1 })
        const handler = vi.fn()
        core.on('options-updated', handler)
        core.updateOptions({ maxRetries: 5 })
        expect(core.options.maxRetries).toBe(5)
        expect(handler).toHaveBeenCalled()
        core.destroy()
    })

    // ── Snapshot ──
    it('getSnapshot → restore round-trip', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('snap.txt')])
        const snap = core.getSnapshot()

        const core2 = new UpupCore({})
        core2.restore(snap)
        expect(core2.files.size).toBe(1)
        core.destroy()
        core2.destroy()
    })

    // ── Validation ──
    it('validateFiles is read-only', async () => {
        const core = new UpupCore({ allowedFileTypes: 'text/plain' })
        await core.addFiles([makeFile('keep.txt')])
        const results = await core.validateFiles([makeFile('check.txt')])
        expect(results).toHaveLength(1)
        expect(results[0]!.valid).toBe(true)
        expect(core.files.size).toBe(1) // unchanged
        core.destroy()
    })

    // ── Events ──
    it('on/off/emit work correctly', () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        // Dynamic event names live on the namespaced surface (F-723) —
        // bare names are the typed CoreEvents catalog only.
        const unsub = core.on('custom:event', handler)
        core.emit('custom:event', { data: 1 })
        expect(handler).toHaveBeenCalledWith({ data: 1 })
        unsub()
        core.emit('custom:event', { data: 2 })
        expect(handler).toHaveBeenCalledTimes(1)
        core.destroy()
    })

    // ── Plugins ──
    it('use() registers plugin and ext provides access', () => {
        const core = new UpupCore({})
        core.use({
            name: 'smoke-plugin',
            init: () => {
                internals(core).pluginManager.registerExtension('smoke', {
                    ok: true,
                })
            },
        })
        expect(core.getExtension('smoke')).toEqual({ ok: true })
        core.destroy()
    })

    // ── Progress ──
    it('progress reflects file completion', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        expect(core.progress.totalFiles).toBe(2)
        expect(core.progress.completedFiles).toBe(0)
        expect(core.progress.percentage).toBe(0)

        // Simulate one file completed
        const [id] = [...core.files.keys()]
        internals(core).fileManager.updateFile(id!, { key: 'uploaded/a.txt' })
        expect(core.progress.completedFiles).toBe(1)
        expect(core.progress.percentage).toBe(50)
        core.destroy()
    })

    // ── Destroy ──
    it('destroy clears everything', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('x.txt')])
        core.use({
            name: 'tmp',
            init: () => {
                internals(core).pluginManager.registerExtension('tmp', {
                    v: 1,
                })
            },
        })
        core.pause()

        core.destroy()
        expect(core.files.size).toBe(0)
        expect(core.status).toBe(UploadStatus.IDLE)
        expect(core.getExtension('tmp')).toBeUndefined()
    })
})
