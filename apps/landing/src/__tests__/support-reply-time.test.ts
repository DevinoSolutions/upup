import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SupportPage, { metadata } from '@/app/support/page'
import SupportForm from '@/app/support/SupportForm'
import FAQSection from '@/components/FAQSection'
import FeedbackSection from '@/components/FeedbackSection'
import {
    SUPPORT_REPLY_PROMISE,
    SUPPORT_SUCCESS_REPLY_TEXT,
    SUPPORT_SUCCESS_TEXT,
} from '@/lib/support/reply-time'

// Every support surface says plainly that a human replies within 1 business
// day. Marketing wording, not a contractual SLA, so no refund/guarantee words.
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
    renderToStaticMarkup(el)

describe('support reply-time promise', () => {
    it('/support page hero and meta carry the promise', () => {
        const markup = html(createElement(SupportPage))
        expect(markup).toContain(SUPPORT_REPLY_PROMISE)
        expect(markup).toContain('within 1 business day')
        expect(String(metadata.description)).toContain('within 1 business day')
    })

    it('the form states the reply time next to the submit button', () => {
        const markup = html(createElement(SupportForm))
        expect(markup).toContain('data-testid="support-reply-promise"')
        expect(markup).toContain('a human replies within 1 business day.')
    })

    it('only promises a reply in the confirmation when one was asked for', () => {
        expect(SUPPORT_SUCCESS_TEXT).toMatch(/we got it/i)
        expect(SUPPORT_SUCCESS_TEXT).not.toContain('business day')
        expect(SUPPORT_SUCCESS_REPLY_TEXT).toMatch(/we got it/i)
        expect(SUPPORT_SUCCESS_REPLY_TEXT).toContain('within 1 business day')
    })

    it('home feedback section and FAQ footer line carry it', () => {
        expect(html(createElement(FeedbackSection))).toContain(
            'within 1 business day',
        )
        expect(html(createElement(FAQSection))).toContain(
            'within 1 business day',
        )
    })

    it('stays marketing wording, never a contractual SLA', () => {
        for (const text of [
            SUPPORT_REPLY_PROMISE,
            SUPPORT_SUCCESS_REPLY_TEXT,
        ]) {
            expect(text).not.toMatch(/(sla|guarantee|refund|credit)/i)
        }
    })
})
