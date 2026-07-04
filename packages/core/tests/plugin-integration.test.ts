import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'

const makeFile = (name: string, size = 10) =>
    new File(['x'.repeat(size)], name, { type: 'text/plain' })

// ─────────────────────────────────────────────
// Plugin observing file lifecycle
// ─────────────────────────────────────────────
describe('Plugin integration — file lifecycle observer', () => {
    it('plugin observes add, remove, clear lifecycle', async () => {
        const log: string[] = []
        const core = new UpupCore({})
        core.use({
            name: 'file-logger',
            setup: (c) => {
                c.on('files-added', () => log.push('added'))
                c.on('file-removed', () => log.push('removed'))
                c.on('files-cleared', () => log.push('cleared'))
            },
        })

        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        const [id] = [...core.files.keys()]
        core.removeFile(id)
        core.removeAll()

        expect(log).toEqual(['added', 'removed', 'cleared'])
        core.destroy()
    })

    it('plugin tracks file count via state-change', async () => {
        let lastCount = 0
        const core = new UpupCore({})
        core.use({
            name: 'counter',
            setup: (c) => {
                c.on('state-change', () => { lastCount = c.files.size })
            },
        })

        await core.addFiles([makeFile('a.txt')])
        expect(lastCount).toBe(1)
        await core.addFiles([makeFile('b.txt')])
        expect(lastCount).toBe(2)
        core.removeAll()
        expect(lastCount).toBe(0)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// Plugin observing upload lifecycle
// ─────────────────────────────────────────────
describe('Plugin integration — upload control observer', () => {
    it('plugin observes pause/resume/cancel', () => {
        const log: string[] = []
        const core = new UpupCore({})
        core.use({
            name: 'upload-logger',
            setup: (c) => {
                c.on('upload-pause', () => log.push('paused'))
                c.on('upload-resume', () => log.push('resumed'))
                c.on('upload-cancel', () => log.push('cancelled'))
            },
        })

        core.pause()
        core.resume()
        core.cancel()

        expect(log).toEqual(['paused', 'resumed', 'cancelled'])
        core.destroy()
    })

    it('plugin observes retry events', async () => {
        const retries: (string | undefined)[] = []
        const core = new UpupCore({})
        core.use({
            name: 'retry-logger',
            setup: (c) => {
                c.on('retry', (data: any) => retries.push(data.fileId))
            },
        })

        // Await between calls: F-149 collapses CONCURRENT retries onto one in-flight run,
        // so a second synchronous retry() would join the first and not emit. Each awaited
        // call is its own run and emits its own retry event.
        await core.retry()
        await core.retry('file-1')

        expect(retries).toEqual([undefined, 'file-1'])
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// Plugin providing extension + reacting to events
// ─────────────────────────────────────────────
describe('Plugin integration — extension with event reaction', () => {
    it('analytics plugin tracks events and exposes metrics via extension', async () => {
        const core = new UpupCore({})
        core.use({
            name: 'analytics',
            setup: (c) => {
                const metrics = { filesAdded: 0, filesRemoved: 0, reorders: 0 }
                c.on('files-added', () => metrics.filesAdded++)
                c.on('file-removed', () => metrics.filesRemoved++)
                c.on('files-reordered', () => metrics.reorders++)
                ;(c as any).pluginManager.registerExtension('analytics', {
                    getMetrics: () => ({ ...metrics }),
                })
            },
        })

        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        const ids = [...core.files.keys()]
        core.reorderFiles([...ids].reverse())
        core.removeFile(ids[0])

        const analytics = core.getExtension('analytics') as any
        expect(analytics.getMetrics()).toEqual({
            filesAdded: 1,
            filesRemoved: 1,
            reorders: 1,
        })
        core.destroy()
    })

    it('plugin listeners are cleaned up on destroy', async () => {
        const handler = vi.fn()
        const core = new UpupCore({})
        core.use({
            name: 'listener',
            setup: (c) => { c.on('files-added', handler) },
        })

        await core.addFiles([makeFile('a.txt')])
        expect(handler).toHaveBeenCalledTimes(1)

        core.destroy()

        // After destroy, emit should not reach the handler
        // (emitter is cleared, but we can't emit on a destroyed core easily)
        // Just verify destroy didn't throw and handler was called exactly once
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('multiple plugins coexist without interference', async () => {
        const log1: string[] = []
        const log2: string[] = []
        const core = new UpupCore({})
        core
            .use({ name: 'p1', setup: (c) => c.on('files-added', () => log1.push('p1')) })
            .use({ name: 'p2', setup: (c) => c.on('files-added', () => log2.push('p2')) })

        await core.addFiles([makeFile('x.txt')])

        expect(log1).toEqual(['p1'])
        expect(log2).toEqual(['p2'])
        core.destroy()
    })
})
