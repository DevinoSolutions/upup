// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gtag', () => ({ event: vi.fn() }))
vi.mock('@/components/HomepageFeatures/notify-signup', () => ({
    submitAndRecordProviderInterest: vi.fn(async () => true),
}))
vi.mock('@/components/FeatureShowcase', () => ({ default: () => null }))
vi.mock('next/link', () => ({
    default: ({ children }: { children: unknown }) => children,
}))

import HomepageFeatures from '@/components/HomepageFeatures'
import { submitAndRecordProviderInterest } from '@/components/HomepageFeatures/notify-signup'

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => {
        root.render(createElement(HomepageFeatures))
    })
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
})

function plannedTile(name: string): HTMLButtonElement {
    const tile = [...container.querySelectorAll('button')].find(
        b => b.textContent?.trim() === name,
    )
    if (!tile) throw new Error(`no planned tile named ${name}`)
    return tile
}

function openFrom(name: string) {
    const trigger = plannedTile(name)
    act(() => trigger.focus())
    act(() => trigger.click())
    return trigger
}

// Located by structure (the panel wrapping the form), not by role, so the
// behavioural tests below fail on behaviour, not on the missing role.
function dialog(): HTMLElement {
    return document
        .querySelector('input[type="email"]')!
        .closest<HTMLElement>('.max-w-md')!
}

function isOpen(): boolean {
    return document.querySelector('input[type="email"]') !== null
}

function press(key: string, shiftKey = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        key,
        shiftKey,
        bubbles: true,
        cancelable: true,
    })
    act(() => {
        const target = document.activeElement ?? document.body
        target.dispatchEvent(event)
    })
    return event
}

function fillEmail() {
    const email = dialog().querySelector<HTMLInputElement>(
        'input[type="email"]',
    )!
    const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
    )!.set!
    act(() => {
        setValue.call(email, 'a@b.co')
        email.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

// The notify modal is the one real dialog on the homepage: it must announce
// itself as a modal, take focus when it opens, keep Tab inside, close on
// Escape, and hand focus back to whatever opened it.
describe('notify modal accessibility', () => {
    it('is a labelled modal dialog', () => {
        openFrom('Instagram')
        const el = dialog()
        expect(el.getAttribute('role')).toBe('dialog')
        expect(el.getAttribute('aria-modal')).toBe('true')
        const labelId = el.getAttribute('aria-labelledby')
        expect(labelId).toBeTruthy()
        expect(document.getElementById(labelId!)?.textContent).toBe(
            'Get notified for Instagram',
        )
    })

    it('moves focus to the email input on open', () => {
        openFrom('Instagram')
        const email = dialog().querySelector<HTMLInputElement>(
            'input[type="email"]',
        )
        expect(document.activeElement).toBe(email)
    })

    it('closes on Escape and returns focus to the trigger', () => {
        const trigger = openFrom('Instagram')
        press('Escape')
        expect(isOpen()).toBe(false)
        expect(document.activeElement).toBe(trigger)
    })

    it('closes from Cancel and returns focus to the trigger', () => {
        const trigger = openFrom('Instagram')
        const cancel = [...dialog().querySelectorAll('button')].find(
            b => b.textContent === 'Cancel',
        )!
        act(() => cancel.click())
        expect(isOpen()).toBe(false)
        expect(document.activeElement).toBe(trigger)
    })

    it('wraps Tab from the last control to the first and Shift+Tab back', () => {
        openFrom('Instagram')
        const controls = [...dialog().querySelectorAll<HTMLElement>('button')]
        const first = controls[0]
        const last = controls[controls.length - 1]

        act(() => last.focus())
        press('Tab')
        expect(document.activeElement).toBe(first)

        press('Tab', true)
        expect(document.activeElement).toBe(last)
    })

    it('marks the honeypot as untabbable and hidden, and the trap skips it', () => {
        openFrom('Instagram')
        const honeypot = dialog().querySelector<HTMLInputElement>(
            'input[name="website"]',
        )!
        expect(honeypot.tabIndex).toBe(-1)
        expect(honeypot.getAttribute('aria-hidden')).toBe('true')

        // Focus can still land on it programmatically; the trap must treat it
        // as outside the stop list and send Tab to a real control.
        const first = dialog().querySelector<HTMLElement>('button')!
        act(() => honeypot.focus())
        expect(document.activeElement).toBe(honeypot)
        const event = press('Tab')
        expect(event.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(first)
    })

    it('keeps Tab inside while a submit is in flight and the submit button is disabled', () => {
        vi.mocked(submitAndRecordProviderInterest).mockImplementationOnce(
            () => new Promise(() => {}),
        )
        openFrom('Instagram')
        fillEmail()
        const submit = dialog().querySelector<HTMLButtonElement>(
            'button[type="submit"]',
        )!
        act(() => submit.focus())
        act(() => submit.click())
        expect(submit.disabled).toBe(true)
        expect(document.activeElement).toBe(submit)

        const controls = [...dialog().querySelectorAll<HTMLElement>('button')]
        const first = controls[0]
        const enabled = controls.filter(b => !(b as HTMLButtonElement).disabled)

        const forward = press('Tab')
        expect(forward.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(first)

        act(() => submit.focus())
        const backward = press('Tab', true)
        expect(backward.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(enabled[enabled.length - 1])
    })

    it('returns focus to the trigger even when the click never focused it', () => {
        const trigger = plannedTile('Instagram')
        // Safari and Firefox on macOS do not focus a button on click.
        act(() => trigger.click())
        expect(document.activeElement).not.toBe(trigger)
        press('Escape')
        expect(document.activeElement).toBe(trigger)
    })

    it('announces success and drops the success timer when closed early', async () => {
        vi.useFakeTimers()
        try {
            openFrom('Instagram')
            fillEmail()
            await act(async () => {
                dialog()
                    .querySelector<HTMLButtonElement>('button[type="submit"]')!
                    .click()
            })
            const status = document.querySelector('[role="status"]')
            expect(status?.textContent).toContain("You're all set!")

            press('Escape')
            expect(isOpen()).toBe(false)

            // Reopen before the 2 s success timer would have fired: the stale
            // timer must not close it.
            openFrom('Instagram')
            expect(isOpen()).toBe(true)
            act(() => {
                vi.advanceTimersByTime(2500)
            })
            expect(isOpen()).toBe(true)
            expect(document.querySelector('[role="status"]')).toBeNull()
        } finally {
            vi.useRealTimers()
        }
    })
})
