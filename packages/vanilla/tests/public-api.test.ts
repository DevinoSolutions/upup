import { describe, it, expect } from 'vitest'
import * as pkg from '../src/index'

/**
 * Pins @upup/vanilla's curated public runtime export list (F-142).
 * A change here is a deliberate public-API change, not an accident.
 */
const EXPECTED_PUBLIC_VALUE_EXPORTS = [
    'FileSource',
    'StorageProvider',
    'UploadStatus',
    'createUploader',
].sort()

describe('public API surface (F-142)', () => {
    it('exposes exactly the curated runtime export list from the package entry', () => {
        const actual = Object.keys(pkg).sort()
        expect(actual).toEqual(EXPECTED_PUBLIC_VALUE_EXPORTS)
    })
})
