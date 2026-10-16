import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/docs/' }))

import ThemeToggler from '@/components/ThemeToggler'
import { DocsSidebar } from '@/components/docs/DocsSidebar'

// Mobile tap-target / legibility floor (T-2840). Measured at 390px on the live
// dev site: the docs sidebar menu alone put ~70 links at 32px tall, 6px apart,
// on every docs page. The pins below keep the fixes from being "cleaned up".
// Where the desktop layout must not change the mobile size is a `min-h-11` /
// `py-3` that a breakpoint variant undoes.

const classesOf = (html: string, tag: string) =>
    [...html.matchAll(new RegExp(`<${tag}[^>]*class="([^"]*)"`, 'g'))].map(m =>
        m[1].split(/\s+/),
    )

describe('mobile tap targets', () => {
    it('gives every docs sidebar link a 44px mobile row and the compact desktop row back at lg', () => {
        const html = renderToStaticMarkup(
            createElement(DocsSidebar, {
                tree: [
                    {
                        type: 'page',
                        name: 'Getting Started',
                        url: '/docs/getting-started/',
                    },
                    {
                        type: 'folder',
                        name: 'Guides',
                        url: '/docs/guides/',
                        children: [
                            {
                                type: 'page',
                                name: 'Modes',
                                url: '/docs/guides/modes/',
                            },
                        ],
                    },
                ],
            }),
        )
        const links = classesOf(html, 'a')
        expect(links).toHaveLength(3)
        for (const cls of links) {
            expect(cls).toContain('py-3')
            expect(cls).toContain('lg:py-1.5')
            expect(cls).not.toContain('py-1.5')
        }
    })

    it('gives the theme toggle a 44px hit area', () => {
        const html = renderToStaticMarkup(
            createElement(ThemeToggler, { isDarkMode: false }),
        )
        const [button] = classesOf(html, 'button')
        expect(button).toContain('min-h-11')
        expect(button).toContain('min-w-11')
        // The header is already 44px tall at lg; the icon stays its own size.
        expect(button).toContain('lg:min-h-0')
        expect(button).toContain('lg:min-w-0')
    })
})

describe('mobile legibility floor', () => {
    // 12px is the floor (text-xs). The mockup/diagram components under
    // UploaderScene and FeatureShowcase/vignettes are decorative and not covered.
    it.each([
        'components/HomepageFeatures/index.tsx',
        'components/docs/DocsSearch.tsx',
        'components/docs/CodeCardControls.tsx',
    ])('%s has no text below 12px', file => {
        const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
        expect(src).not.toMatch(/text-\[(9|10|11)px\]/)
    })
})
