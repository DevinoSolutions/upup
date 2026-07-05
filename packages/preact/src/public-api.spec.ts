import { describe, it, expect } from 'vitest'
import * as pkg from './index'
import * as reactPkg from '@upup/react'

/**
 * @upup/preact's entry is a one-line `export * from '@upup/react'` (F-142) —
 * its public surface is defined to equal react's, not a separately
 * maintained list. Asserting equality (rather than duplicating react's
 * literal list here) keeps this test correct automatically if react's
 * surface changes, and still catches an accidental narrowing/widening of
 * preact's own barrel.
 */
describe('public API surface (F-142)', () => {
    it('exposes exactly the same runtime export list as @upup/react', () => {
        expect(Object.keys(pkg).sort()).toEqual(Object.keys(reactPkg).sort())
    })
})
