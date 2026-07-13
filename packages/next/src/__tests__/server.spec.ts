import { describe, it, expect } from 'vitest'
import * as serverEntry from '../server'
import * as upstream from '@useupup/server/next'

// The App Router handler + origin utils live in @useupup/server/next; this entry
// must re-export the SAME functions (behavior is tested in @useupup/server).
describe('@useupup/next/server re-exports', () => {
    it('createUpupNextHandler is the @useupup/server/next function', () => {
        expect(serverEntry.createUpupNextHandler).toBe(
            upstream.createUpupNextHandler,
        )
    })

    it('origin utils are the @useupup/server/next functions', () => {
        expect(serverEntry.normalizeRequestOrigin).toBe(
            upstream.normalizeRequestOrigin,
        )
        expect(serverEntry.resolveOrigin).toBe(upstream.resolveOrigin)
    })
})
