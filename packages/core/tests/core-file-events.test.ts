import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

const makeFile = (name = 'test.txt', size = 100, type = 'text/plain'): File =>
    new File(['x'.repeat(size)], name, { type })

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

// ─────────────────────────────────────────────
// files-reordered
// ─────────────────────────────────────────────
describe('UpupCore — files-reordered event', () => {
    it('emits files-reordered with the new order', async () => {
        const core = makeCore()
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')])
        const ids = [...core.files.keys()]

        const handler = vi.fn()
        core.on('files-reordered', handler)

        const reversed = [...ids].reverse()
        core.reorderFiles(reversed)

        expect(handler).toHaveBeenCalledWith({ fileIds: reversed })
    })

    it('also emits state-change when reordering', async () => {
        const core = makeCore()
        await core.addFiles([makeFile('x.txt'), makeFile('y.txt')])
        const ids = [...core.files.keys()]

        const stateHandler = vi.fn()
        core.on('state-change', stateHandler)
        core.reorderFiles(ids)

        expect(stateHandler).toHaveBeenCalled()
    })

    it('emits files-reordered even with a single file', async () => {
        const core = makeCore()
        await core.addFiles([makeFile('solo.txt')])
        const [id] = [...core.files.keys()]

        const handler = vi.fn()
        core.on('files-reordered', handler)
        core.reorderFiles([id])

        expect(handler).toHaveBeenCalledWith({ fileIds: [id] })
    })
})

// ─────────────────────────────────────────────
// files-cleared
// ─────────────────────────────────────────────
describe('UpupCore — files-cleared event', () => {
    it('emits files-cleared after removeAll()', async () => {
        const core = makeCore()
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])

        const handler = vi.fn()
        core.on('files-cleared', handler)
        core.removeAll()

        expect(handler).toHaveBeenCalledWith({})
        expect(core.files.size).toBe(0)
    })

    it('emits files-cleared even when no files exist', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-cleared', handler)
        core.removeAll()
        expect(handler).toHaveBeenCalled()
    })

    it('also emits state-change when clearing', async () => {
        const core = makeCore()
        await core.addFiles([makeFile('f.txt')])

        const stateHandler = vi.fn()
        core.on('state-change', stateHandler)
        core.removeAll()

        expect(stateHandler).toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────
// files-set
// ─────────────────────────────────────────────
describe('UpupCore — files-set event', () => {
    it('emits files-set after setFiles()', async () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-set', handler)

        await core.setFiles([makeFile('a.txt'), makeFile('b.txt')])

        expect(handler).toHaveBeenCalledWith({ count: 2 })
    })

    it('count reflects the actual files in the map', async () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-set', handler)

        await core.setFiles([makeFile('only.txt')])

        const call = handler.mock.calls[0][0] as { count: number }
        expect(call.count).toBe(core.files.size)
    })

    it('emits files-set with count 0 for empty array', async () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-set', handler)

        await core.setFiles([])

        expect(handler).toHaveBeenCalledWith({ count: 0 })
    })

    it('also emits state-change when setting files', async () => {
        const core = makeCore()
        const stateHandler = vi.fn()
        core.on('state-change', stateHandler)

        await core.setFiles([makeFile('f.txt')])

        expect(stateHandler).toHaveBeenCalled()
    })
})
