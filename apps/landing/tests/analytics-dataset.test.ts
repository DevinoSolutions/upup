import { describe, expect, it } from 'vitest'
import {
    e2eSuperProperties,
    parseE2ETestContext,
    resolveDataset,
} from '@/lib/analytics/dataset'

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

describe('parseE2ETestContext', () => {
    it('returns an empty context for null/undefined/empty input', () => {
        expect(parseE2ETestContext(null)).toEqual({})
        expect(parseE2ETestContext(undefined)).toEqual({})
        expect(parseE2ETestContext('')).toEqual({})
    })

    it('returns an empty context for malformed JSON without throwing', () => {
        expect(parseE2ETestContext('{not json')).toEqual({})
    })

    it('extracts only string testRunId / testScenario fields', () => {
        expect(
            parseE2ETestContext(
                JSON.stringify({
                    testRunId: 'e2e:123-abc',
                    testScenario: 'support-happy-path',
                    extra: 'ignored',
                }),
            ),
        ).toEqual({
            testRunId: 'e2e:123-abc',
            testScenario: 'support-happy-path',
        })
    })

    it('drops non-string fields', () => {
        expect(parseE2ETestContext(JSON.stringify({ testRunId: 42 }))).toEqual(
            {},
        )
    })
})

describe('e2eSuperProperties', () => {
    const ctx = { testRunId: 'e2e:123-abc', testScenario: 'thumbs-down' }

    it('is empty on the production dataset (never attaches e2e tags)', () => {
        expect(e2eSuperProperties('production', ctx)).toEqual({})
    })

    it('is empty on the disabled dataset', () => {
        expect(e2eSuperProperties('disabled', ctx)).toEqual({})
    })

    it('tags app_id/environment plus the run correlation ids on e2e', () => {
        expect(e2eSuperProperties('e2e', ctx)).toEqual({
            app_id: 'upup-landing',
            environment: 'e2e',
            test_run_id: 'e2e:123-abc',
            test_scenario: 'thumbs-down',
        })
    })

    it('omits absent correlation ids but keeps app_id/environment on e2e', () => {
        expect(e2eSuperProperties('e2e', {})).toEqual({
            app_id: 'upup-landing',
            environment: 'e2e',
        })
    })
})
