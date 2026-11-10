// @vitest-environment jsdom
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

const regions = (
    notice?: Parameters<typeof SupportNoticeRegion>[0]['notice'],
) => {
    const root = document.createElement('div')
    root.innerHTML = html(createElement(SupportNoticeRegion, { notice }))
    return {
        status: root.querySelector<HTMLElement>(':scope > [role="status"]')!,
        alert: root.querySelector<HTMLElement>(':scope > [role="alert"]')!,
        root,
    }
}

describe('SupportNoticeRegion', () => {
    it('keeps both live regions mounted and empty when there is no notice', () => {
        const { status, alert } = regions()
        expect(status).not.toBeNull()
        expect(alert).not.toBeNull()
        expect(status.childElementCount).toBe(0)
        expect(alert.childElementCount).toBe(0)
    })

    it('never nests one live region inside the other', () => {
        for (const kind of ['success', 'warning', 'error'] as const) {
            const { root } = regions({ kind, text: 'x' })
            expect(root.querySelectorAll('[role] [role]')).toHaveLength(0)
        }
    })

    it('cancels the flex gap of each region while it is empty', () => {
        // The form is a `gap-6` column: a zero-height empty region would still
        // add a 24px gap and push the submit row down in the idle state.
        const { status, alert } = regions()
        expect(status.className).toContain('empty:-mt-6')
        expect(alert.className).toContain('empty:-mt-6')
    })

    it('puts a success notice in the polite status region', () => {
        const { status, alert } = regions({ kind: 'success', text: 'Thanks' })
        expect(
            status.querySelector('[data-testid="support-notice"]')?.textContent,
        ).toBe('Thanks')
        expect(alert.childElementCount).toBe(0)
    })

    it('puts warning and error notices in the alert region', () => {
        for (const kind of ['warning', 'error'] as const) {
            const { status, alert } = regions({ kind, text: 'Nope' })
            expect(
                alert.querySelector('[data-testid="support-notice"]')
                    ?.textContent,
            ).toBe('Nope')
            expect(status.childElementCount).toBe(0)
        }
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
