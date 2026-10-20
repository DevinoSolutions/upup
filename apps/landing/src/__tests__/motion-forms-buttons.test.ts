import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
    SubmitLabel,
    SupportNoticeRegion,
} from '@/app/support/support-feedback'
import { CopyIconSwap } from '@/components/copy-icon-swap'

// Motion audit rows 1 and 2 (forms + buttons). The animations are CSS-only and
// motion-safe gated, so the pins here hold the parts a reader can verify in
// markup: the live regions stay mounted, the icon swap stacks both icons in a
// fixed box (opacity only), and nothing animates unless motion-safe allows it.

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) =>
    renderToStaticMarkup(el)

describe('SupportNoticeRegion', () => {
    it('keeps an always-mounted role=status region when there is no notice', () => {
        const out = html(createElement(SupportNoticeRegion, {}))
        expect(out).toContain('role="status"')
        expect(out).toContain('aria-live="polite"')
        expect(out).not.toContain('data-testid="support-notice"')
    })

    it('renders a success notice inside the status region without its own role', () => {
        const out = html(
            createElement(SupportNoticeRegion, {
                notice: { kind: 'success', text: 'Thanks' },
            }),
        )
        expect(out).toContain('data-testid="support-notice"')
        expect(out).toContain('Thanks')
        expect(out).not.toContain('role="alert"')
    })

    it('keeps role=alert on an error notice', () => {
        const out = html(
            createElement(SupportNoticeRegion, {
                notice: { kind: 'error', text: 'Nope' },
            }),
        )
        expect(out).toContain('role="alert"')
    })

    it('gives the notice a motion-safe enter and an opacity-only reduced fallback', () => {
        const out = html(
            createElement(SupportNoticeRegion, {
                notice: { kind: 'success', text: 'Thanks' },
            }),
        )
        expect(out).toContain('motion-safe:animate-motion-enter-down')
        expect(out).toContain('motion-reduce:animate-motion-fade')
    })
})

describe('SubmitLabel', () => {
    it('stacks both labels and hides only the inactive one from AT', () => {
        const idle = html(createElement(SubmitLabel, { submitting: false }))
        expect(idle).toContain('Send request')
        expect(idle).toContain('Sending…')
        expect(idle.match(/aria-hidden="true"/g)).toHaveLength(1)
        const busy = html(createElement(SubmitLabel, { submitting: true }))
        expect(busy.match(/aria-hidden="true"/g)).toHaveLength(1)
        expect(busy.indexOf('aria-hidden="true"')).not.toBe(
            idle.indexOf('aria-hidden="true"'),
        )
    })

    it('cross-fades with opacity only', () => {
        const out = html(createElement(SubmitLabel, { submitting: false }))
        expect(out).toContain('transition-opacity')
        expect(out).not.toContain('transition-all')
    })
})

describe('CopyIconSwap', () => {
    it('stacks both icons in one fixed box and shows only the active one', () => {
        const idle = html(createElement(CopyIconSwap, { copied: false }))
        expect(idle).toContain('h-3.5 w-3.5')
        expect(idle.match(/<svg/g)).toHaveLength(2)
        expect(idle).toContain('opacity-0')
        expect(idle).toContain('opacity-100')
        const done = html(createElement(CopyIconSwap, { copied: true }))
        expect(done).not.toBe(idle)
    })

    it('uses opacity only: no scale or rotate on the swap', () => {
        const out = html(createElement(CopyIconSwap, { copied: true }))
        expect(out).toContain('transition-opacity')
        expect(out).not.toMatch(/scale-|rotate-/)
        expect(out).toContain('aria-hidden')
    })
})
