import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

// ─────────────────────────────────────────────
// addFiles with onBeforeFileAdded returning File
// ─────────────────────────────────────────────
describe('UpupCore.addFiles — onBeforeFileAdded returning File', () => {
    it('uses returned File instead of original', async () => {
        const replacement = makeFile('replaced.txt', 5)
        const core = new UpupCore({
            onBeforeFileAdded: async () => replacement,
        })
        await core.addFiles([makeFile('original.txt', 10)])
        const names = [...core.files.values()].map(f => f.name)
        expect(names).toContain('replaced.txt')
        expect(names).not.toContain('original.txt')
        core.destroy()
    })

    it('returning true keeps the original file', async () => {
        const core = new UpupCore({
            onBeforeFileAdded: async () => true,
        })
        await core.addFiles([makeFile('keep-me.txt')])
        expect([...core.files.values()][0].name).toBe('keep-me.txt')
        core.destroy()
    })

    it('returning false rejects the file', async () => {
        const core = new UpupCore({
            onBeforeFileAdded: async () => false,
        })
        await core.addFiles([makeFile('reject-me.txt')])
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('callback is called for each file in the batch', async () => {
        const fn = vi.fn(async () => true)
        const core = new UpupCore({ onBeforeFileAdded: fn })
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')])
        expect(fn).toHaveBeenCalledTimes(3)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// addFiles with maxTotalFileSize
// ─────────────────────────────────────────────
describe('UpupCore.addFiles — maxTotalFileSize', () => {
    it('accepts files within total size limit', async () => {
        const core = new UpupCore({ maxTotalFileSize: { size: 100, unit: 'B' } })
        await core.addFiles([makeFile('a.txt', 30), makeFile('b.txt', 30)])
        expect(core.files.size).toBe(2)
        core.destroy()
    })

    it('rejects batch when cumulative size exceeds limit', async () => {
        const core = new UpupCore({ maxTotalFileSize: { size: 50, unit: 'B' } })
        await core.addFiles([makeFile('a.txt', 30)])
        await expect(core.addFiles([makeFile('b.txt', 30)])).rejects.toThrow()
        expect(core.files.size).toBe(1)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// addFiles with accept filtering
// ─────────────────────────────────────────────
describe('UpupCore.addFiles — mixed valid/invalid in batch', () => {
    it('rejects entire batch when one file is invalid', async () => {
        const core = new UpupCore({ accept: 'text/plain' })
        // Adding a mix — behavior depends on implementation
        await expect(
            core.addFiles([makeFile('ok.txt', 10, 'text/plain'), makeFile('bad.png', 10, 'image/png')]),
        ).rejects.toThrow()
        core.destroy()
    })

    it('accepts all files when all match accept', async () => {
        const core = new UpupCore({ accept: 'text/plain' })
        await core.addFiles([
            makeFile('a.txt', 10, 'text/plain'),
            makeFile('b.txt', 10, 'text/plain'),
        ])
        expect(core.files.size).toBe(2)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// addFiles events
// ─────────────────────────────────────────────
describe('UpupCore.addFiles — event emission', () => {
    it('emits files-added with the added files', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('files-added', handler)
        await core.addFiles([makeFile('x.txt')])
        expect(handler).toHaveBeenCalledOnce()
        const added = handler.mock.calls[0][0]
        expect(Array.isArray(added)).toBe(true)
        expect(added[0].name).toBe('x.txt')
        core.destroy()
    })

    it('emits state-change after files-added', async () => {
        const core = new UpupCore({})
        const events: string[] = []
        core.on('files-added', () => events.push('files-added'))
        core.on('state-change', () => events.push('state-change'))
        await core.addFiles([makeFile('y.txt')])
        expect(events).toEqual(['files-added', 'state-change'])
        core.destroy()
    })

    it('does not emit files-added when all rejected', async () => {
        const core = new UpupCore({ onBeforeFileAdded: async () => false })
        const handler = vi.fn()
        core.on('files-added', handler)
        await core.addFiles([makeFile('rejected.txt')])
        expect(handler).not.toHaveBeenCalled()
        core.destroy()
    })
})
