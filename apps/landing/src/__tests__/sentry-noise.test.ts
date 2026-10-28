import { describe, expect, it } from 'vitest'
import { SENTRY_IGNORED_ERRORS } from '@/lib/analytics/sentry-noise'

// Sentry's ignoreErrors tests each pattern against the event's message, which
// for a rejected promise carrying a string is the text below (UPUP-LANDING-6).
const ignored = (message: string) =>
    SENTRY_IGNORED_ERRORS.some(pattern => pattern.test(message))

describe('Sentry ignoreErrors on the landing', () => {
    it("drops the Outlook link scanner's 'Object Not Found Matching Id' rejection", () => {
        expect(
            ignored(
                'Non-Error promise rejection captured with value: Object Not Found Matching Id:5, MethodName:update, ParamCount:4',
            ),
        ).toBe(true)
        expect(
            ignored('Object Not Found Matching Id:12, MethodName:update, ParamCount:4'),
        ).toBe(true)
    })

    it('keeps reporting every other rejection and error', () => {
        expect(
            ignored('Non-Error promise rejection captured with value: undefined'),
        ).toBe(false)
        expect(ignored('TypeError: Failed to fetch')).toBe(false)
        expect(ignored('Object Not Found')).toBe(false)
    })
})
