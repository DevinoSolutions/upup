import { describe, it, expect } from 'vitest'
import { stateStoryArgs, stateStoryPlays } from './state-stories'

const KEYS = ['uploadSuccess', 'uploadError', 'restrictedFileRejected'] as const

describe('state story specs', () => {
    it('every story auto-uploads from the local source', () => {
        for (const key of KEYS) {
            expect(stateStoryArgs[key].autoUpload).toBe(true)
            expect(stateStoryArgs[key].sources).toEqual(['local'])
        }
    })

    it('uploadError fails fast (no retry storm against the 500 handler)', () => {
        expect(stateStoryArgs.uploadError.maxRetries).toBe(0)
    })

    it('restrictedFileRejected constrains file types and captures the rejection', () => {
        expect(stateStoryArgs.restrictedFileRejected.allowedFileTypes).toBe(
            'application/pdf',
        )
        expect(typeof stateStoryArgs.restrictedFileRejected.onError).toBe(
            'function',
        )
    })

    it('exposes a play function per story', () => {
        for (const key of KEYS) {
            expect(typeof stateStoryPlays[key]).toBe('function')
        }
    })
})
