import { describe, expect, it } from 'vitest'
import { resolveDataset } from '@/lib/analytics/dataset'

describe('resolveDataset', () => {
    it('honors an explicit production selector', () => {
        expect(resolveDataset('production', false)).toBe('production')
    })

    it('honors an explicit e2e selector without falling back to production', () => {
        expect(resolveDataset('e2e', true)).toBe('e2e')
    })

    it('honors an explicit disabled selector even when a key exists', () => {
        expect(resolveDataset('disabled', true)).toBe('disabled')
    })

    it('defaults to production when unset and a production key exists', () => {
        expect(resolveDataset(undefined, true)).toBe('production')
    })

    it('defaults to disabled when unset and no production key exists', () => {
        expect(resolveDataset(undefined, false)).toBe('disabled')
    })

    it('treats an unrecognized selector as unset (falls to the default)', () => {
        expect(resolveDataset('staging', false)).toBe('disabled')
    })
})
