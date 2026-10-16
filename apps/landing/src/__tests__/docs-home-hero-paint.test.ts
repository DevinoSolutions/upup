import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The demo is a client-only embed; the hero markup is what is under test.
vi.mock('@/components/docs/DocsUploaderDemo', () => ({
    DocsUploaderDemo: () => createElement('div', { 'data-testid': 'demo' }),
}))

import { DocsHome } from '@/components/docs/DocsHome'

// /docs/ is a mobile LCP page: its headline and intro are the LCP element. A
// framer-motion `initial` of opacity 0 lands in the server HTML as an inline
// style and keeps them invisible until hydration (LCP 6.4 s vs FCP 1.8 s), so
// the hero must be server-rendered visible; the CSS `hero-lift` class only
// slides it.

describe('docs home hero paint', () => {
    const html = renderToStaticMarkup(createElement(DocsHome))
    const hero = html.slice(0, html.indexOf('data-testid="docs-section-cards"'))

    it('renders the hero headline and intro before the section cards', () => {
        expect(hero).toContain('Everything you need to')
        expect(hero).toContain('A file uploader with a native UI')
    })

    it('server-renders the hero visible, with no inline opacity', () => {
        expect(hero).not.toMatch(/opacity:\s*0/)
    })

    it('slides the hero columns in with the CSS hero-lift class', () => {
        expect(hero.match(/class="hero-lift"/g)).toHaveLength(2)
    })
})
