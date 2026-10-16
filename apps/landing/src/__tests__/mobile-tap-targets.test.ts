import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/docs/' }))

import FrameworkStrip from '@/components/FrameworkStrip'
import ThemeToggler from '@/components/ThemeToggler'
import { CodeCardControls } from '@/components/docs/CodeCardControls'
import { MessageBody } from '@/components/docs/DocsAskAi'
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

    it('insets the overlay on mobile so the 44px button fits a one-line card', () => {
        const [overlay] = classLists(html, 'div')
        expect(overlay).toEqual(
            expect.arrayContaining([
                'top-2.5',
                'right-2.5',
                'max-lg:top-1',
                'max-lg:right-1',
            ]),
        )
    })

    it('reserves right padding for the button on mobile only, in the .upup-code pre rule', () => {
        const css = readFileSync(
            new URL('../app/globals.css', import.meta.url),
            'utf8',
        )
        // Same breakpoint as Tailwind's max-lg (below 1024px).
        const rule = css.match(
            /@media not all and \(min-width: 1024px\)\s*\{\s*\.upup-code > pre\s*\{([^}]*)\}/,
        )
        expect(rule, 'mobile .upup-code > pre rule missing').not.toBeNull()
        expect((rule as RegExpMatchArray)[1]).toMatch(
            /padding-right:\s*3\.5rem/,
        )
        // The desktop base rule must not carry the padding.
        const base = css.match(
            /\.upup-code > pre \{\s*overflow-x: auto;([^}]*)\}/,
        )
        expect(base, 'base .upup-code > pre rule missing').not.toBeNull()
        expect((base as RegExpMatchArray)[1]).not.toMatch(/padding/)
    })

    it('keeps the visible icon size', () => {
        expect(html).toMatch(/<svg[^>]*class="[^"]*\bh-3\.5 w-3\.5\b/)
    })
})

describe('Ask AI chat copy-code button on touch (T-3023)', () => {
    // Same fix as the docs code cards, on the chat's own fence renderer. The
    // answer is a fixture string rendered through MessageBody: no agent request
    // is made. The pre also gets mobile room so the 44px button fits a one-line
    // fence (~42px) and the end of a long line can be scrolled clear of it.
    const html = renderToStaticMarkup(
        createElement(MessageBody, {
            content: '```bash\nnpm i @useupup/react\n```',
        }),
    )
    const [button] = classLists(html, 'button')
    const [pre] = classLists(html, 'pre')

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

    it('gives it a 44px mobile hit area that lg undoes, centred on mobile only', () => {
        expect(button).toEqual(
            expect.arrayContaining([
                'min-h-11',
                'min-w-11',
                'lg:min-h-0',
                'lg:min-w-0',
                'max-lg:flex',
                'max-lg:items-center',
                'max-lg:justify-center',
            ]),
        )
        // Unscoped flex would change the desktop 28x28 box.
        expect(button).not.toContain('flex')
        expect(button).not.toContain('items-center')
    })

    it('insets the button on mobile and keeps the visible icon size', () => {
        expect(button).toEqual(
            expect.arrayContaining([
                'right-1.5',
                'top-1.5',
                'max-lg:right-0.5',
                'max-lg:top-0.5',
            ]),
        )
        expect(html).toMatch(/<svg[^>]*class="[^"]*\bh-3\.5 w-3\.5\b/)
    })

    it('gives the pre mobile room for the button and leaves desktop padding alone', () => {
        expect(pre).toEqual(
            expect.arrayContaining([
                'p-3',
                'pr-9',
                'max-lg:min-h-12',
                'max-lg:pr-14',
            ]),
        )
    })
})
