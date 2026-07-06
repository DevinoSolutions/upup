import { vi } from 'vitest'
import type { UploadFile } from '@upup/core'
import { createUpupUpload, type UseUpupUploadOptions } from './use-upup-upload'

// Minimal valid CoreOptions — all fields are optional; empty object is sufficient.
const baseOptions: UseUpupUploadOptions = {}

describe('createUpupUpload', () => {
    it('delegates to core and forwards events after start()', () => {
        const onAdded = vi.fn()
        const u = createUpupUpload({ ...baseOptions, onFileAdded: onAdded })
        u.start()

        // Verify delegating methods are exposed
        expect(typeof u.addFiles).toBe('function')
        expect(typeof u.removeFile).toBe('function')
        expect(typeof u.removeAll).toBe('function')
        expect(typeof u.upload).toBe('function')
        expect(u.core).toBeTruthy()

        // core.emit('files-added', payload) calls handler(payload) — payload is UploadFile[]
        // The listener registered in start() forwards it to onFileAdded.
        // core.emit signature: emit(event, payload) — single payload arg.
        const fakeFiles = [{ id: 'f1', name: 'test.txt' }] as UploadFile[]
        u.core.emit('files-added', fakeFiles)

        expect(onAdded).toHaveBeenCalledWith(fakeFiles)

        u.destroy()
    })

    it('exposes signal accessors with initial values', () => {
        const u = createUpupUpload(baseOptions)
        u.start()
        // signals are functions; calling them returns the current value
        expect(typeof u.files).toBe('function')
        expect(typeof u.status).toBe('function')
        expect(typeof u.progress).toBe('function')
        expect(typeof u.error).toBe('function')
        // initial values
        expect(Array.isArray(u.files())).toBe(true)
        expect(u.error()).toBeNull()
        u.destroy()
    })

    it('destroy is idempotent and tears down without throwing', () => {
        const u = createUpupUpload(baseOptions)
        u.start()
        expect(() => {
            u.destroy()
            u.destroy()
        }).not.toThrow()
    })

    it('start() is idempotent — calling twice does not double-register listeners', () => {
        const onAdded = vi.fn()
        const u = createUpupUpload({ ...baseOptions, onFileAdded: onAdded })
        u.start()
        u.start() // second call must be a no-op

        const fakeFiles = [{ id: 'f2', name: 'b.txt' }] as UploadFile[]
        u.core.emit('files-added', fakeFiles)

        // Must have been called exactly once, not twice
        expect(onAdded).toHaveBeenCalledTimes(1)
        u.destroy()
    })

    it('after destroy(), core events do NOT reach callbacks', () => {
        const onAdded = vi.fn()
        const u = createUpupUpload({ ...baseOptions, onFileAdded: onAdded })
        u.start()
        u.core.emit('files-added', [
            { id: 'pre', name: 'pre.txt' },
        ] as UploadFile[])
        expect(onAdded).toHaveBeenCalledTimes(1) // wired before destroy
        u.destroy()
        u.core.emit('files-added', [
            { id: 'post', name: 'post.txt' },
        ] as UploadFile[])
        expect(onAdded).toHaveBeenCalledTimes(1) // still 1 — listener removed
    })

    it('state-change syncs signals from core', () => {
        const u = createUpupUpload(baseOptions)
        u.start()
        u.core.emit('state-change', {})
        expect(u.status()).toBe(u.core.status)
        expect(u.files().length).toBe([...u.core.files.values()].length)
        u.destroy()
    })

    it('forwards upload-all-complete to onUploadComplete', () => {
        const onComplete = vi.fn()
        const u = createUpupUpload({
            ...baseOptions,
            onUploadComplete: onComplete,
        })
        u.start()
        const done = [{ id: 'a', name: 'a.txt' }] as UploadFile[]
        u.core.emit('upload-all-complete', done)
        expect(onComplete).toHaveBeenCalledWith(done)
        u.destroy()
    })
})
