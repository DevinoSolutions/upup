import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

describe('UpupCore — integration lifecycle', () => {
    it('add → getSnapshot → destroy → restore round-trip', async () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        expect(core.files.size).toBe(2)

        const snapshot = core.getSnapshot()
        expect(snapshot.files).toHaveLength(2)
        expect(snapshot.status).toBe(UploadStatus.IDLE)

        core.destroy()
        expect(core.files.size).toBe(0)

        // New core restores from snapshot
        const core2 = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        core2.restore(snapshot)
        expect(core2.files.size).toBe(2)
        expect(core2.status).toBe(UploadStatus.IDLE)
        core2.destroy()
    })

    it('add → removeFile → removeAll clears everything', async () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')])
        expect(core.files.size).toBe(3)

        const [firstId] = [...core.files.keys()]
        core.removeFile(firstId)
        expect(core.files.size).toBe(2)

        core.removeAll()
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('add → reorder preserves all files', async () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        await core.addFiles([makeFile('x.txt'), makeFile('y.txt'), makeFile('z.txt')])
        const ids = [...core.files.keys()]

        core.reorderFiles([...ids].reverse())
        expect(core.files.size).toBe(3)
        const newIds = [...core.files.keys()]
        expect(newIds).toEqual([...ids].reverse())
        core.destroy()
    })

    it('add → setFiles replaces all files', async () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        await core.addFiles([makeFile('old.txt')])
        expect(core.files.size).toBe(1)

        await core.setFiles([makeFile('new1.txt'), makeFile('new2.txt')])
        expect(core.files.size).toBe(2)
        const names = [...core.files.values()].map(f => f.name)
        expect(names).toContain('new1.txt')
        expect(names).toContain('new2.txt')
        expect(names).not.toContain('old.txt')
        core.destroy()
    })

    it('add → validateFiles does not mutate file list', async () => {
        const core = new UpupCore({
            allowedFileTypes: 'text/plain',
            maxFileSize: { size: 100, unit: 'B' },
        })
        await core.addFiles([makeFile('ok.txt', 5, 'text/plain')])

        const results = await core.validateFiles([
            makeFile('good.txt', 10, 'text/plain'),
            makeFile('bad.png', 10, 'image/png'),
        ])

        expect(results).toHaveLength(2)
        expect(results[0].valid).toBe(true)
        expect(results[1].valid).toBe(false)
        // Original file list unchanged
        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('pause → cancel resets to IDLE', () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('full event flow for add → remove emits in correct order', async () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        const events: string[] = []
        core.on('files-added', () => events.push('files-added'))
        core.on('file-removed', () => events.push('file-removed'))
        core.on('files-cleared', () => events.push('files-cleared'))
        core.on('state-change', () => events.push('state-change'))

        await core.addFiles([makeFile('a.txt')])
        const [id] = [...core.files.keys()]
        core.removeFile(id)
        core.removeAll()

        expect(events).toEqual([
            'files-added', 'state-change',      // addFiles
            'file-removed', 'state-change',     // removeFile
            'state-change', 'files-cleared',    // removeAll
        ])
        core.destroy()
    })

    it('updateOptions emits options-updated and updates core.options', () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        const handler = vi.fn()
        core.on('options-updated', handler)

        core.updateOptions({ maxRetries: 10 })
        expect(core.options.maxRetries).toBe(10)
        expect(handler).toHaveBeenCalledWith({ partial: { maxRetries: 10 } })
        core.destroy()
    })

    it('plugin registration survives addFiles/removeAll', async () => {
        const core = new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })
        core.use({
            name: 'counter',
            init: (emitter) => {
                let count = 0
                emitter.on('files-added', () => {
                    count++
                })
                ;(core as any)._pluginCount = () => count
            },
        })

        await core.addFiles([makeFile('a.txt')])
        await core.addFiles([makeFile('b.txt')])
        expect((core as any)._pluginCount()).toBe(2)

        core.removeAll()
        expect(core.files.size).toBe(0)
        // Plugin still works
        await core.addFiles([makeFile('c.txt')])
        expect((core as any)._pluginCount()).toBe(3)
        core.destroy()
    })
})
