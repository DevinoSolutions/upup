import { describe, expect, it } from 'vitest'
import { resolveSuccessNotice } from '@/lib/support/success-notice'
import {
    SUPPORT_SUCCESS_REPLY_TEXT,
    SUPPORT_SUCCESS_TEXT,
} from '@/lib/support/reply-time'

// The success branch of SupportForm.onSuccess, extracted so the wantsReply
// handling is unit-testable without a DOM (T-6911).
describe('resolveSuccessNotice', () => {
    it('promises a reply when one was asked for and the email leg landed', () => {
        const result = resolveSuccessNotice(true, 'ok')
        expect(result.text).toBe(SUPPORT_SUCCESS_REPLY_TEXT)
        expect(result.text).toContain('within 1 business day')
        expect(result.warning).toBeUndefined()
    })

    it('does not promise a reply when the server reports the email failed', () => {
        const result = resolveSuccessNotice(true, 'failed')
        expect(result.text).toBe(SUPPORT_SUCCESS_TEXT)
        expect(result.text).not.toContain('business day')
        expect(result.warning).toMatch(/reply delivery failed/i)
    })

    it('keeps the reply promise when email is simply not configured', () => {
        const result = resolveSuccessNotice(true, 'not_configured')
        expect(result.text).toBe(SUPPORT_SUCCESS_REPLY_TEXT)
        expect(result.warning).toBeUndefined()
    })

    it('never promises a reply, or warns about one, when none was asked for', () => {
        for (const emailLeg of ['ok', 'failed', 'not_configured'] as const) {
            const result = resolveSuccessNotice(false, emailLeg)
            expect(result.text).toBe(SUPPORT_SUCCESS_TEXT)
            expect(result.warning).toBeUndefined()
        }
    })
})
