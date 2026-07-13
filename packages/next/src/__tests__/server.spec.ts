import { describe, it, expect } from 'vitest'
import * as serverEntry from '../server'
import * as upstream from '@upupjs/server/next'

// The App Router handler + origin utils live in @upupjs/server/next; this entry
// must re-export the SAME functions (behavior is tested in @upupjs/server).
describe('@upupjs/next/server re-exports', () => {
    it('createUpupNextHandler is the @upupjs/server/next function', () => {
        expect(serverEntry.createUpupNextHandler).toBe(
            upstream.createUpupNextHandler,
        )
    })

    it('origin utils are the @upupjs/server/next functions', () => {
        expect(serverEntry.normalizeRequestOrigin).toBe(
            upstream.normalizeRequestOrigin,
        )
        expect(serverEntry.resolveOrigin).toBe(upstream.resolveOrigin)
    })
})
