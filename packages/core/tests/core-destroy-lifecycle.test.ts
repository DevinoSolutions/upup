import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/core'

const makeFile = (name: string) =>
    new File(['x'], name, { type: 'text/plain' })

describe('UpupCore — destroy lifecycle', () => {
    it('clears all files on destroy', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt'), makeFile('b.txt')])
        expect(core.files.size).toBe(2)
        core.destroy()
        expect(core.files.size).toBe(0)
    })

    it('resets status to IDLE on destroy', () => {
        const core = new UpupCore({})
        core.pause()
        core.destroy()
        expect(core.status).toBe(UploadStatus.IDLE)
    })

    it('clears error on destroy', () => {
        const core = new UpupCore({})
        core.destroy()
        expect(core.error).toBeNull()
    })

    it('emits destroyed event before clearing listeners', () => {
        const core = new UpupCore({})
        let eventFired = false
        core.on('destroyed', () => { eventFired = true })
        core.destroy()
        expect(eventFired).toBe(true)
    })

    it('listeners do not fire after destroy', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('files-added', handler)
        core.destroy()
        // Emitting after destroy — handler should NOT fire (listeners cleared)
        core.emit('files-added', [])
        expect(handler).not.toHaveBeenCalled()
    })

    it('extensions are cleared after destroy', () => {
        const core = new UpupCore({})
        core.use({
            name: 'test-ext',
            setup: (c) => {
                (c as any).pluginManager.registerExtension('test', { val: 1 })
            },
        })
        expect(core.getExtension('test')).toBeDefined()
        core.destroy()
        expect(core.getExtension('test')).toBeUndefined()
    })

    it('progress returns zero after destroy', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('f.txt')])
        core.destroy()
        expect(core.progress).toEqual({
            totalFiles: 0,
            completedFiles: 0,
            percentage: 0,
        })
    })

    it('can be called multiple times safely', () => {
        const core = new UpupCore({})
        expect(() => {
            core.destroy()
            core.destroy()
            core.destroy()
        }).not.toThrow()
    })

    it('destroyed event fires only on first destroy', () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.on('destroyed', handler)
        core.destroy() // fires and clears listeners
        core.destroy() // no listeners remain
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('addFiles still works on a fresh core after destroying another', async () => {
        const core1 = new UpupCore({})
        await core1.addFiles([makeFile('old.txt')])
        core1.destroy()

        const core2 = new UpupCore({})
        await core2.addFiles([makeFile('new.txt')])
        expect(core2.files.size).toBe(1)
        expect([...core2.files.values()][0].name).toBe('new.txt')
        core2.destroy()
    })
})
