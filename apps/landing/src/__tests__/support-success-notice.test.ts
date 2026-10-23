import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
    interpretSupportResponse,
    resolveSuccessNotice,
} from '@/lib/support/success-notice'
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

describe('interpretSupportResponse', () => {
    const landed = (email: 'ok' | 'failed' | 'not_configured') => ({
        ok: true,
        email,
    })

    it('turns a 200 whose email leg landed into the reply-promise success', () => {
        expect(
            interpretSupportResponse({
                httpOk: true,
                body: landed('ok'),
                wantsReply: true,
            }),
        ).toEqual({ kind: 'success', text: SUPPORT_SUCCESS_REPLY_TEXT })
    })

    it('takes wantsReply and the email leg from the right inputs (swapped or hardcoded values change the outcome)', () => {
        const success = (wantsReply: boolean, email: 'ok' | 'failed') => {
            const outcome = interpretSupportResponse({
                httpOk: true,
                body: landed(email),
                wantsReply,
            })
            if (outcome.kind !== 'success') throw new Error('expected success')
            return outcome
        }
        expect(success(true, 'ok').text).toBe(SUPPORT_SUCCESS_REPLY_TEXT)
        expect(success(false, 'ok').text).toBe(SUPPORT_SUCCESS_TEXT)
        expect(success(true, 'failed').text).toBe(SUPPORT_SUCCESS_TEXT)
        expect(success(true, 'failed').warning).toBeDefined()
        expect(success(false, 'failed').warning).toBeUndefined()
    })

    it('is a failure for a non-2xx, a missing body, or ok:false', () => {
        const failure = { kind: 'failure' }
        expect(
            interpretSupportResponse({
                httpOk: false,
                body: landed('ok'),
                wantsReply: true,
            }),
        ).toEqual(failure)
        expect(
            interpretSupportResponse({
                httpOk: true,
                body: null,
                wantsReply: true,
            }),
        ).toEqual(failure)
        expect(
            interpretSupportResponse({
                httpOk: true,
                body: { ok: false, email: 'failed' },
                wantsReply: true,
            }),
        ).toEqual(failure)
    })

    it('SupportForm hands the submitted wantsReply and the response body to it', () => {
        // The form needs a DOM to render and this suite runs in node, so pin
        // the wiring at the call site: the live state and the parsed body,
        // never literals.
        const source = readFileSync(
            fileURLToPath(
                new URL('../app/support/SupportForm.tsx', import.meta.url),
            ),
            'utf8',
        )
        expect(source).toMatch(
            /interpretSupportResponse\(\{\s*httpOk: res\.ok,\s*body,\s*wantsReply,?\s*\}\)/,
        )
    })
})
