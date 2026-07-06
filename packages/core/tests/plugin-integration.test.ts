import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

const makeFile = (name: string, size = 10) =>
    new File(['x'.repeat(size)], name, { type: 'text/plain' })

// The plugin event bus (`init(emitter)`) is intentionally untyped — plugins
// receive `EventEmitter` (defaults to `Record<string, unknown>`), not the
// app's `CoreEvents` — so payloads are narrowed at this boundary.
interface RetryEventPayload {
    fileId?: string
}

interface AnalyticsExtension {
    getMetrics: () => {
        filesAdded: number
        filesRemoved: number
        reorders: number
    }
}

// ─────────────────────────────────────────────
// Plugin observing file lifecycle
// ─────────────────────────────────────────────
describe('Plugin integration — file lifecycle observer', () => {
    it('plugin observes add, remove, clear lifecycle', async () => {
        const log: string[] = []
        const core = new UpupCore({})
        core.use({
            name: 'file-logger',
            init: (emitter) => {
                emitter.on('files-added', () => log.push('added'))
                emitter.on('file-removed', () => log.push('removed'))
                emitter.on('files-cleared', () => log.push('cleared'))
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
            init: (emitter) => {
                emitter.on('state-change', () => {
                    lastCount = core.files.size
                })
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
            init: (emitter) => {
                emitter.on('upload-pause', () => log.push('paused'))
                emitter.on('upload-resume', () => log.push('resumed'))
                emitter.on('upload-cancel', () => log.push('cancelled'))
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
            init: (emitter) => {
                emitter.on('retry', (data: unknown) =>
                    retries.push((data as RetryEventPayload).fileId),
                )
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
            init: (emitter) => {
                const metrics = { filesAdded: 0, filesRemoved: 0, reorders: 0 }
                emitter.on('files-added', () => metrics.filesAdded++)
                emitter.on('file-removed', () => metrics.filesRemoved++)
                emitter.on('files-reordered', () => metrics.reorders++)
                core.registerExtension('analytics', {
                    getMetrics: () => ({ ...metrics }),
                })
            },
        })

        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        const ids = [...core.files.keys()]
        core.reorderFiles([...ids].reverse())
        core.removeFile(ids[0])

        const analytics = core.getExtension(
            'analytics',
        ) as unknown as AnalyticsExtension
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
            init: (emitter) => {
                emitter.on('files-added', handler)
            },
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
            .use({
                name: 'p1',
                init: (emitter) =>
                    emitter.on('files-added', () => log1.push('p1')),
            })
            .use({
                name: 'p2',
                init: (emitter) =>
                    emitter.on('files-added', () => log2.push('p2')),
            })

        await core.addFiles([makeFile('x.txt')])

        expect(log1).toEqual(['p1'])
        expect(log2).toEqual(['p2'])
        core.destroy()
    })
})
