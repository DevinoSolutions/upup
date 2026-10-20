// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/image', () => ({
    default: (props: { alt: string }) =>
        createElement('img', { alt: props.alt }),
}))

import Navbar from '@/components/Navbar'

// Motion audit spot 6: the mobile menu eases in and the hamburger/X icon
// cross-fades. The animation sits on the INNER div.px-6 (never the
// backdrop-blur container: fading a backdrop-filter repaints the blur every
// frame), exit is instant, and reduced motion keeps opacity only.

;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const source = readFileSync(
    resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../components/Navbar.tsx',
    ),
    'utf8',
)

let container: HTMLDivElement
let root: Root

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    act(() => root.render(createElement(Navbar)))
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
})

const toggle = () =>
    container.querySelector<HTMLButtonElement>(
        'button[aria-controls="navbar-mobile-menu"]',
    )!
const icon = () =>
    container.querySelector<SVGElement>(
        '[data-testid="navbar-toggle-icon"] > svg',
    )!

describe('Navbar mobile menu motion', () => {
    it('keeps the toggle aria contract in both states', () => {
        expect(toggle().getAttribute('aria-expanded')).toBe('false')
        expect(container.querySelector('#navbar-mobile-menu')).toBeNull()
        act(() => toggle().click())
        expect(toggle().getAttribute('aria-expanded')).toBe('true')
        expect(container.querySelector('#navbar-mobile-menu')).not.toBeNull()
        act(() => toggle().click())
        expect(toggle().getAttribute('aria-expanded')).toBe('false')
        // Exit is instant: the menu unmounts with no presence layer.
        expect(container.querySelector('#navbar-mobile-menu')).toBeNull()
    })

    it('holds the swapped icon in a fixed 20px box inside the toggle', () => {
        const box = toggle().querySelector(
            '[data-testid="navbar-toggle-icon"]',
        )!
        expect(box.className).toMatch(/\bh-5\b/)
        expect(box.className).toMatch(/\bw-5\b/)
        expect(box.children).toHaveLength(1)
    })

    it('does not fade the hamburger in on page load, only after a toggle', () => {
        expect(icon().getAttribute('class')).not.toContain('animate-')
        act(() => toggle().click())
        expect(icon().getAttribute('class')).toContain(
            'motion-safe:animate-motion-fade',
        )
        act(() => toggle().click())
        expect(icon().getAttribute('class')).toContain(
            'motion-safe:animate-motion-fade',
        )
    })

    it('animates the inner padded div, not the backdrop-blur container', () => {
        act(() => toggle().click())
        const menu = container.querySelector('#navbar-mobile-menu')!
        expect(menu.className).toContain('backdrop-blur-xl')
        expect(menu.className).not.toMatch(/animate-/)
        const inner = menu.firstElementChild!
        expect(inner.className).toContain('px-6')
        expect(inner.className).toContain(
            'motion-safe:animate-motion-enter-down',
        )
        // Reduced motion: opacity only, no translate.
        expect(inner.className).toContain('motion-reduce:animate-motion-fade')
    })

    it('never uses a translating animation under reduced motion', () => {
        expect(source).not.toMatch(/motion-reduce:animate-motion-enter/)
    })
})
