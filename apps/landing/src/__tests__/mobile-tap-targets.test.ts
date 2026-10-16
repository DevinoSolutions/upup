import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/docs/' }))

import FrameworkStrip from '@/components/FrameworkStrip'
import ThemeToggler from '@/components/ThemeToggler'
import { CodeCardControls } from '@/components/docs/CodeCardControls'
import { DocsSearchTrigger } from '@/components/docs/DocsSearch'
import { DocsSidebar } from '@/components/docs/DocsSidebar'

// Mobile tap-target / legibility floor (T-2840). Measured at 390px on the live
// dev site: the docs sidebar menu alone put ~70 links per docs page at 32px
// tall, 6px apart, on every docs page.
//
// Every size bump is mobile-scoped: a mobile floor (`min-h-11`, `py-3`,
// `max-lg:text-xs`) plus the breakpoint variant that keeps the desktop size
// (`md:`/`lg:min-h-0`, `lg:py-1.5`, the base `text-[10px]`). These pins cover
// the rendered components where that is cheap and otherwise assert the class
// string in the source; they do not measure geometry (the live 390px/1280px
// before/after numbers are in the PR). Not covered: decorative mockups under
// UploaderScene and FeatureShowcase/vignettes.

const classLists = (html: string, tag: string) =>
    [...html.matchAll(new RegExp(`<${tag}[^>]*class="([^"]*)"`, 'g'))].map(m =>
        m[1].split(/\s+/),
    )

// The class-name literal in `file` that contains `anchor`, as a token list.
const sourceClasses = (file: string, anchor: string) => {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    const literal = src.match(
        new RegExp(`[\`"']([^\`"']*${anchor}[^\`"']*)[\`"']`),
    )
    expect(literal, `${anchor} not found in ${file}`).not.toBeNull()
    return (literal as RegExpMatchArray)[1].split(/\s+/)
}

describe('mobile tap targets (rendered)', () => {
    it('gives every docs sidebar link a 44px mobile row and the compact row back at lg', () => {
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
        const links = classLists(html, 'a')
        expect(links).toHaveLength(3)
        for (const cls of links) {
            expect(cls).toContain('py-3')
            expect(cls).toContain('lg:py-1.5')
            expect(cls).not.toContain('py-1.5')
        }
    })

    it('gives the theme toggle a 44px mobile hit area that lg undoes', () => {
        const html = renderToStaticMarkup(
            createElement(ThemeToggler, { isDarkMode: false }),
        )
        const [button] = classLists(html, 'button')
        expect(button).toEqual(
            expect.arrayContaining([
                'min-h-11',
                'min-w-11',
                'lg:min-h-0',
                'lg:min-w-0',
            ]),
        )
    })

    it('gives every framework chip a 44px mobile row that md undoes', () => {
        const html = renderToStaticMarkup(createElement(FrameworkStrip, {}))
        const chips = classLists(html, 'a')
        expect(chips.length).toBeGreaterThanOrEqual(6)
        for (const cls of chips) {
            expect(cls).toContain('min-h-11')
            expect(cls).toContain('md:min-h-0')
        }
    })

    it('gives the docs search trigger a 44px mobile row and a 12px-on-mobile kbd hint', () => {
        const html = renderToStaticMarkup(
            createElement(DocsSearchTrigger, { onClick: () => {} }),
        )
        const [button] = classLists(html, 'button')
        expect(button).toEqual(
            expect.arrayContaining(['min-h-11', 'lg:min-h-0']),
        )
        const [kbd] = classLists(html, 'kbd')
        expect(kbd).toEqual(
            expect.arrayContaining(['text-[10px]', 'max-lg:text-xs']),
        )
        expect(kbd).not.toContain('text-xs')
    })
})

describe('mobile tap targets (class string in source)', () => {
    it.each([
        [
            'components/docs/DocsChrome.tsx',
            'cursor-pointer list-none',
            ['min-h-11'],
        ],
        [
            'components/docs/DocsChrome.tsx',
            'bg-blue-50',
            ['min-h-11', 'lg:min-h-0'],
        ],
        ['components/docs/DocsChrome.tsx', 'fixed bottom-5', ['min-h-11']],
        [
            'components/docs/FrameworkTabsClient.tsx',
            'rounded-t-md',
            ['min-h-11', 'md:min-h-0'],
        ],
        [
            'components/FrameworkSnippets/index.tsx',
            'px-3.5 py-1.5',
            ['min-h-11', 'md:min-h-0'],
        ],
        [
            'components/FeatureShowcase/index.tsx',
            'group mt-2',
            ['min-h-11', 'md:min-h-0', 'md:mt-5'],
        ],
    ])('%s (%s) keeps %j', (file, anchor, tokens) => {
        expect(sourceClasses(file, anchor)).toEqual(
            expect.arrayContaining(tokens),
        )
    })
})

describe('mobile legibility floor', () => {
    // 12px is the mobile floor, scoped so desktop keeps its 10px: an unscoped
    // `text-xs` (which would grow the desktop card/pill) fails here.
    it.each([
        [
            'components/HomepageFeatures/index.tsx',
            'leading-tight text-gray-500',
        ],
        ['components/docs/DocsSearch.tsx', 'leading-none'],
        ['components/docs/CodeCardControls.tsx', 'font-medium uppercase'],
    ])('%s (%s) is text-[10px] with max-lg:text-xs', (file, anchor) => {
        const cls = sourceClasses(file, anchor)
        expect(cls).toEqual(
            expect.arrayContaining(['text-[10px]', 'max-lg:text-xs']),
        )
        expect(cls).not.toContain('text-xs')
    })
})

describe('docs copy-code button on touch (T-2944)', () => {
    // The overlay reveals on card hover, so on a device with no hover it was
    // invisible AND 28x28. Visibility is keyed to the input capability
    // (`hover:none`), not a width breakpoint: a large touch tablet is >= lg and
    // still has no hover. The 44px size is mobile-scoped like the rest of the
    // file; the icon (h-3.5) and the desktop hover reveal are untouched.
    const html = renderToStaticMarkup(
        createElement(CodeCardControls, { language: 'tsx', getText: () => '' }),
    )
    const [button] = classLists(html, 'button')

    it('shows the button without hover on hover:none devices', () => {
        expect(button).toContain('[@media(hover:none)]:opacity-100')
    })

    it('keeps the desktop hover and keyboard reveal', () => {
        expect(button).toEqual(
            expect.arrayContaining([
                'opacity-0',
                'group-hover:opacity-100',
                'focus-visible:opacity-100',
            ]),
        )
    })

    it('gives it a 44px mobile hit area that lg undoes', () => {
        expect(button).toEqual(
            expect.arrayContaining([
                'min-h-11',
                'min-w-11',
                'lg:min-h-0',
                'lg:min-w-0',
            ]),
        )
    })

    it('keeps the visible icon size', () => {
        expect(html).toMatch(/<svg[^>]*class="[^"]*\bh-3\.5 w-3\.5\b/)
    })
})
