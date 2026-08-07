import { describe, it, expect } from 'vitest'
import { useUpupUpload } from '../src/use-upup-upload'
import { withSetup } from './helpers'

/**
 * The initial-state and destroy-on-unmount cases this file used to carry are
 * owned by uploader-mount-creates-fresh-core-and-unmount-destroys-it.test.ts,
 * which asserts the same things harder — the same files/status initial values
 * plus the whole P6 terminal-destroy contract, and destroy() called exactly
 * once rather than merely called. What remains here is the returned method
 * shape, which that file does not cover.
 */
describe('useUpupUpload', () => {
    it('exposes upload/pause/resume/cancel methods', () => {
        const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
        expect(typeof result.upload).toBe('function')
        expect(typeof result.pause).toBe('function')
        expect(typeof result.resume).toBe('function')
        expect(typeof result.cancel).toBe('function')
        unmount()
    })
})
