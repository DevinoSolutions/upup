import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

const makeFile = (name: string, size = 10) =>
    new File(['x'.repeat(size)], name, { type: 'text/plain' })

// ─────────────────────────────────────────────
// setFiles
// ─────────────────────────────────────────────
describe('UpupCore.setFiles', () => {
    it('replaces all existing files', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('old1.txt'), makeFile('old2.txt')])
        expect(core.files.size).toBe(2)

        await core.setFiles([makeFile('new.txt')])
        expect(core.files.size).toBe(1)
        expect([...core.files.values()][0].name).toBe('new.txt')
        core.destroy()
    })

    it('emits files-set event with correct count', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('files-set', handler)

        await core.setFiles([makeFile('a.txt'), makeFile('b.txt')])
        expect(handler).toHaveBeenCalledWith({ count: 2 })
        core.destroy()
    })

    it('setFiles with empty array clears all files', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('keep.txt')])
        await core.setFiles([])
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('setFiles generates fresh IDs', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('first.txt')])
        const oldIds = [...core.files.keys()]

        await core.setFiles([makeFile('second.txt')])
        const newIds = [...core.files.keys()]

        expect(newIds[0]).not.toBe(oldIds[0])
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// removeFile
// ─────────────────────────────────────────────
describe('UpupCore.removeFile', () => {
    it('removes the specified file by id', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        const [id] = [...core.files.keys()]

        core.removeFile(id)
        expect(core.files.size).toBe(1)
        expect(core.files.has(id)).toBe(false)
        core.destroy()
    })

    it('emits file-removed with the removed file', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('target.txt')])
        const [id] = [...core.files.keys()]

        const handler = vi.fn()
        core.on('file-removed', handler)
        core.removeFile(id)

        expect(handler).toHaveBeenCalledOnce()
        const removed = handler.mock.calls[0][0]
        expect(removed.name).toBe('target.txt')
        core.destroy()
    })

    it('does not emit for nonexistent id', () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('file-removed', handler)
        core.removeFile('ghost-id')
        expect(handler).not.toHaveBeenCalled()
        core.destroy()
    })

    it('removes the correct file from a multi-file set', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('keep.txt'), makeFile('remove.txt'), makeFile('also-keep.txt')])
        const entries = [...core.files.entries()]
        const removeId = entries.find(([, f]) => f.name === 'remove.txt')![0]

        core.removeFile(removeId)
        const remaining = [...core.files.values()].map(f => f.name)
        expect(remaining).toContain('keep.txt')
        expect(remaining).toContain('also-keep.txt')
        expect(remaining).not.toContain('remove.txt')
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// removeAll
// ─────────────────────────────────────────────
describe('UpupCore.removeAll', () => {
    it('clears all files', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        core.removeAll()
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('emits files-cleared event', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('x.txt')])
        const handler = vi.fn()
        core.on('files-cleared', handler)
        core.removeAll()
        expect(handler).toHaveBeenCalledWith({})
        core.destroy()
    })

    it('is safe to call on empty core', () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('files-cleared', handler)
        core.removeAll()
        expect(handler).toHaveBeenCalled()
        expect(core.files.size).toBe(0)
        core.destroy()
    })
})
