import { describe, it, expect } from 'vitest'
import * as client from '../index'
import * as server from '../server'
import * as reactPkg from '@upup/react'

/**
 * Pins @upup/next's curated public runtime export lists (F-142).
 * The client entry is a one-line `export * from '@upup/react'` — its surface
 * is defined to equal react's (see @upup/preact's equivalent test), not a
 * separately maintained list. The server entry (App Router handler +
 * Pages Router adapter + config helper + token-store utils) is its own list.
 */
const EXPECTED_SERVER_VALUE_EXPORTS = [
    'InMemoryTokenStore',
    'createUpupNextHandler',
    'createUpupPagesHandler',
    'defineUpupConfig',
    'normalizeRequestOrigin',
    'resolveOrigin',
].sort()

describe('public API surface (F-142)', () => {
    it('client entry exposes exactly the same runtime export list as @upup/react', () => {
        expect(Object.keys(client).sort()).toEqual(
            Object.keys(reactPkg).sort(),
        )
    })

    it('server entry exposes exactly the curated runtime export list', () => {
        expect(Object.keys(server).sort()).toEqual(
            EXPECTED_SERVER_VALUE_EXPORTS,
        )
    })
})
