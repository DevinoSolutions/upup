import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const source = readFileSync(
    new URL('../components/Navbar.tsx', import.meta.url),
    'utf8',
)

describe('Navbar mobile menu motion', () => {
    it('keeps the toggle aria contract and a fixed-size icon box', () => {
        const html = renderToStaticMarkup(createElement(Navbar))
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('aria-controls="navbar-mobile-menu"')
        // The swapped icon lives in a fixed 20px box so the cross-fade can
        // never resize the 44px target or shift neighbours.
        expect(html).toMatch(/<span[^>]*class="[^"]*\bh-5 w-5\b[^"]*"/)
    })

    it('animates the inner padded div, not the backdrop-blur container', () => {
        const menu = source.slice(source.indexOf('id={MOBILE_MENU_ID}'))
        const container = menu.slice(0, menu.indexOf('>'))
        expect(container).toContain('backdrop-blur-xl')
        expect(container).not.toMatch(/animate-/)
        const inner = menu.slice(
            menu.indexOf('<div className="px-6 py-6'),
            menu.indexOf('<ul'),
        )
        expect(inner).toContain('motion-safe:animate-motion-enter-down')
    })

    it('falls back to opacity only under reduced motion', () => {
        expect(source).toContain('motion-reduce:animate-motion-fade')
        expect(source).not.toMatch(/motion-reduce:animate-motion-enter/)
    })

    it('cross-fades the icon swap and has no exit animation', () => {
        expect(source).toContain('motion-safe:animate-motion-fade')
        expect(source).not.toMatch(/animate-motion-[a-z-]*-?(out|exit)/)
    })
})
