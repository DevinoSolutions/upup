import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import type { FileManager } from '../src/file-manager'

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

// ─────────────────────────────────────────────
// on / off / emit (public event API)
// Dispatch mechanics are exercised through the namespaced passthrough —
// since F-723, bare names are the typed CoreEvents catalog only, and
// arbitrary/dynamic events are the '<namespace>:<event>' form.
// ─────────────────────────────────────────────
describe('UpupCore — on() / off() / emit()', () => {
    it('on() returns an unsubscribe function', () => {
        const core = makeCore()
        const handler = vi.fn()
        const unsub = core.on('custom:event', handler)
        expect(typeof unsub).toBe('function')
    })

    it('unsubscribe prevents further calls', () => {
        const core = makeCore()
        const handler = vi.fn()
        const unsub = core.on('custom:event', handler)
        core.emit('custom:event', 'a')
        unsub()
        core.emit('custom:event', 'b')
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith('a')
    })

    it('off() removes the handler', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('custom:test', handler)
        core.off('custom:test', handler)
        core.emit('custom:test')
        expect(handler).not.toHaveBeenCalled()
    })

    it('emit() fires registered handlers with data', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('custom:bridge-event', handler)
        core.emit('custom:bridge-event', { key: 'val' })
        expect(handler).toHaveBeenCalledWith({ key: 'val' })
    })

    it('emit() with no data passes undefined', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('custom:ping', handler)
        core.emit('custom:ping')
        expect(handler).toHaveBeenCalledWith(undefined)
    })

    it('multiple handlers for the same event all fire', () => {
        const core = makeCore()
        const h1 = vi.fn()
        const h2 = vi.fn()
        core.on('custom:multi', h1)
        core.on('custom:multi', h2)
        core.emit('custom:multi', 'data')
        expect(h1).toHaveBeenCalledWith('data')
        expect(h2).toHaveBeenCalledWith('data')
    })

    it('emit does not throw for events with no listeners', () => {
        const core = makeCore()
        expect(() => core.emit('custom:nonexistent')).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// progress getter
// ─────────────────────────────────────────────
describe('UpupCore — progress getter', () => {
    it('returns 0% with no files', () => {
        const core = makeCore()
        expect(core.progress).toEqual({
            totalFiles: 0,
            completedFiles: 0,
            percentage: 0,
        })
    })

    it('returns 0% when files exist but none completed', async () => {
        const core = makeCore()
        await core.addFiles([
            new File(['a'], 'a.txt', { type: 'text/plain' }),
            new File(['b'], 'b.txt', { type: 'text/plain' }),
        ])
        expect(core.progress.totalFiles).toBe(2)
        expect(core.progress.completedFiles).toBe(0)
        expect(core.progress.percentage).toBe(0)
    })

    it('returns correct percentage when some files have keys', async () => {
        const core = makeCore()
        await core.addFiles([
            new File(['a'], 'a.txt', { type: 'text/plain' }),
            new File(['b'], 'b.txt', { type: 'text/plain' }),
        ])
        // Simulate one file completed by setting its key
        const [id] = [...core.files.keys()]
        ;(
            core as unknown as { fileManager: FileManager }
        ).fileManager.updateFile(id!, {
            key: 'uploaded/a.txt',
        })

        expect(core.progress.totalFiles).toBe(2)
        expect(core.progress.completedFiles).toBe(1)
        expect(core.progress.percentage).toBe(50)
    })

    it('returns 100% when all files have keys', async () => {
        const core = makeCore()
        await core.addFiles([new File(['x'], 'x.txt', { type: 'text/plain' })])
        const [id] = [...core.files.keys()]
        ;(
            core as unknown as { fileManager: FileManager }
        ).fileManager.updateFile(id!, {
            key: 'uploaded/x.txt',
        })

        expect(core.progress.percentage).toBe(100)
    })
})

// ─────────────────────────────────────────────
// error getter
// ─────────────────────────────────────────────
describe('UpupCore — error getter', () => {
    it('is null initially', () => {
        const core = makeCore()
        expect(core.error).toBeNull()
    })
})
