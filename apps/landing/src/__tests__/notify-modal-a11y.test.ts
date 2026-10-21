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

function press(key: string, shiftKey = false) {
    act(() => {
        const target = document.activeElement ?? document.body
        target.dispatchEvent(
            new KeyboardEvent('keydown', {
                key,
                shiftKey,
                bubbles: true,
                cancelable: true,
            }),
        )
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

    it('keeps the honeypot out of the tab cycle', () => {
        openFrom('Instagram')
        const honeypot = dialog().querySelector<HTMLInputElement>(
            'input[name="website"]',
        )!
        const email = dialog().querySelector<HTMLInputElement>(
            'input[type="email"]',
        )!
        const cancel = [...dialog().querySelectorAll('button')].find(
            b => b.textContent === 'Cancel',
        )!
        const submit = dialog().querySelector<HTMLElement>(
            'button[type="submit"]',
        )!

        const visited: Element[] = []
        act(() => email.focus())
        for (let i = 0; i < 6; i += 1) {
            press('Tab')
            visited.push(document.activeElement!)
        }
        expect(visited).not.toContain(honeypot)
        // Native tab order between controls is the browser's job; the trap only
        // has to wrap, so the wrap target is always a real control, not the
        // honeypot.
        expect([email, cancel, submit]).toContain(visited[visited.length - 1])
    })
})
