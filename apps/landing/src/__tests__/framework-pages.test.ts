import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
    createElement,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Home from '@/app/page'
import FrameworkPage from '@/app/[framework]/page'
import FAQSection from '@/components/FAQSection'
import FrameworkGuide from '@/components/FrameworkGuide'
import { FRAMEWORK_GUIDES } from '@/components/FrameworkGuide/content'
import StructuredData from '@/components/StructuredData'
import { source } from '@/lib/docs/source'
import { faqs as homeFaqs } from '@/lib/faqs'
import { FRAMEWORK_IDS, FRAMEWORKS, type FrameworkId } from '@/lib/frameworks'
import { canonicalUrl } from '@/lib/site-url'

// Search Console (90 days to 2026-09-26): /vue/ 527 impressions at position
// 47, /react/ 343 at 41, /angular/ 319 at 35 — and zero clicks — while the
// framework pages emitted the home page's FAQPage word for word and carried
// no framework-specific content. These pins keep each framework page unique:
// its own FAQ set (visible and JSON-LD, identical to each other), its own
// quickstart block, and a breadcrumb trail, none of which leak onto /.

type JsonLdNode = Record<string, unknown>

/** Every element in a server-component tree, depth first. */
function elementsOf(node: ReactNode): ReactElement[] {
    if (Array.isArray(node)) return node.flatMap(elementsOf)
    if (!isValidElement(node)) return []
    const props = node.props as { children?: ReactNode }
    return [node, ...elementsOf(props.children)]
}

function elementOfType(
    tree: ReactNode,
    type: unknown,
): ReactElement | undefined {
    return elementsOf(tree).find(element => element.type === type)
}

async function frameworkPageTree(id: FrameworkId): Promise<ReactNode> {
    return FrameworkPage({ params: Promise.resolve({ framework: id }) })
}

function jsonLdNodes(markup: string): JsonLdNode[] {
    return [
        ...markup.matchAll(
            /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
        ),
    ].map(match => JSON.parse(match[1]) as JsonLdNode)
}

function nodesOfType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
    return nodes.filter(node => node['@type'] === type)
}

function faqPageQuestions(markup: string): string[] {
    const pages = nodesOfType(jsonLdNodes(markup), 'FAQPage')
    expect(pages, 'exactly one FAQPage node').toHaveLength(1)
    const entities = pages[0].mainEntity as { name: string }[]
    return entities.map(entity => entity.name)
}

/** The questions a rendered FAQSection shows, in order. */
function visibleQuestions(markup: string): string[] {
    const decode = (text: string) =>
        text
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
    return [
        ...markup.matchAll(/<span id="faq-q-\d+"[^>]*>([\s\S]*?)<\/span>/g),
    ].map(match => decode(match[1]))
}

/** Renders the page's own StructuredData and FAQSection elements. */
function renderSeoParts(tree: ReactNode) {
    const structured = elementOfType(tree, StructuredData)
    const faqSection = elementOfType(tree, FAQSection)
    expect(structured, 'page renders StructuredData').toBeDefined()
    expect(faqSection, 'page renders FAQSection').toBeDefined()
    return {
        jsonLd: renderToStaticMarkup(structured as ReactElement),
        faq: renderToStaticMarkup(faqSection as ReactElement),
    }
}

function textContent(markup: string): string {
    return markup
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/** Every docs page URL, without the trailing slash. */
function docsPageUrls(): Set<string> {
    return new Set(source.getPages().map(page => page.url.replace(/\/$/, '')))
}

/** The /docs/ hrefs in rendered markup, in order. */
function docsHrefs(markup: string): string[] {
    return [...markup.matchAll(/href="(\/docs\/[^"#?]*)"/g)].map(
        // next/link drops the trailing slash outside the Next runtime
        // (trailingSlash is a next.config setting), so compare slashless
        // paths.
        match => match[1].replace(/\/$/, ''),
    )
}

// Search Console shows the framework pages collecting "best/most popular
// <framework> file upload" impressions at positions 43-60, while the docs
// roundups that answer those queries had no link from them. React, Vue and
// Angular link their own roundup; the others have none and link the hub.
const ROUNDUPS: Partial<Record<FrameworkId, string>> = {
    react: '/docs/comparisons/best-react-file-upload-libraries',
    vue: '/docs/comparisons/best-vue-file-upload-libraries',
    angular: '/docs/comparisons/best-angular-file-upload-libraries',
}
const COMPARISONS_HUB = '/docs/comparisons'

describe('per-framework FAQ sets', () => {
    const homeQuestions = homeFaqs.map(faq => faq.question)

    it('keeps the home page FAQ set, visible and in JSON-LD, on the home page', () => {
        const { jsonLd, faq } = renderSeoParts(Home())
        expect(faqPageQuestions(jsonLd)).toEqual(homeQuestions)
        expect(visibleQuestions(faq)).toEqual(homeQuestions)
    })

    it.each(FRAMEWORK_IDS)(
        'emits a /%s/ FAQPage whose questions exactly match the visible FAQ accordion',
        async id => {
            const { jsonLd, faq } = renderSeoParts(await frameworkPageTree(id))
            const questions = faqPageQuestions(jsonLd)
            expect(questions.length).toBeGreaterThanOrEqual(5)
            expect(questions.length).toBeLessThanOrEqual(6)
            expect(visibleQuestions(faq)).toEqual(questions)
        },
    )

    it.each(FRAMEWORK_IDS)(
        'shares no FAQ question between /%s/ and the home page or any other framework page',
        async id => {
            const own = faqPageQuestions(
                renderSeoParts(await frameworkPageTree(id)).jsonLd,
            )
            const others = new Set(homeQuestions)
            for (const other of FRAMEWORK_IDS.filter(fw => fw !== id)) {
                const markup = renderSeoParts(
                    await frameworkPageTree(other),
                ).jsonLd
                for (const question of faqPageQuestions(markup))
                    others.add(question)
            }
            expect(own.filter(question => others.has(question))).toEqual([])
        },
    )

    it('escapes markup quoted in FAQ answers so JSON-LD can never close its script tag', async () => {
        const { jsonLd } = renderSeoParts(await frameworkPageTree('react'))
        const payloads = [
            ...jsonLd.matchAll(
                /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
            ),
        ].map(match => match[1])
        for (const payload of payloads) expect(payload).not.toContain('<')
        const answers = (
            nodesOfType(jsonLdNodes(jsonLd), 'FAQPage')[0].mainEntity as {
                acceptedAnswer: { text: string }
            }[]
        ).map(entity => entity.acceptedAnswer.text)
        expect(answers.some(text => text.includes('<UpupUploader'))).toBe(true)
    })
})

describe('framework guide section', () => {
    it('renders on every framework page for that framework and never on the home page', async () => {
        expect(elementOfType(Home(), FrameworkGuide)).toBeUndefined()
        for (const id of FRAMEWORK_IDS) {
            const guide = elementOfType(
                await frameworkPageTree(id),
                FrameworkGuide,
            )
            expect(guide, `/${id}/ renders FrameworkGuide`).toBeDefined()
            expect((guide?.props as { framework: FrameworkId }).framework).toBe(
                id,
            )
        }
    })

    it.each(FRAMEWORK_IDS)(
        'gives /%s/ a "<Framework> file uploader in 3 steps" heading and the real npm install command',
        id => {
            const fw = FRAMEWORKS[id]
            const markup = renderToStaticMarkup(
                createElement(FrameworkGuide, { framework: id }),
            )
            const headings = [
                ...markup.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g),
            ].map(match => textContent(match[1]))
            expect(headings).toContain(`${fw.name} file uploader in 3 steps`)
            expect(markup).toContain(`npm i ${fw.pkg}`)
        },
    )

    it.each(FRAMEWORK_IDS)(
        'links /%s/ to at least eight docs pages, every one of which exists',
        id => {
            const validUrls = docsPageUrls()
            const markup = renderToStaticMarkup(
                createElement(FrameworkGuide, { framework: id }),
            )
            const docsLinks = [...new Set(docsHrefs(markup))]
            expect(docsLinks.length).toBeGreaterThanOrEqual(8)
            expect(docsLinks).toContain(`/docs/quickstarts/${id}`)
            expect(docsLinks.filter(href => !validUrls.has(href))).toEqual([])
        },
    )

    it.each(FRAMEWORK_IDS)(
        'compares /%s/ against at least two named incumbents with a stated license',
        id => {
            const rows = FRAMEWORK_GUIDES[id].competitors
            expect(rows.length).toBeGreaterThanOrEqual(2)
            const markup = renderToStaticMarkup(
                createElement(FrameworkGuide, { framework: id }),
            )
            for (const row of rows) {
                expect(row.license.trim()).not.toBe('')
                expect(markup).toContain(`>${row.name}</th>`)
            }
        },
    )

    it.each(FRAMEWORK_IDS)(
        'links /%s/ from under its comparison table to its own docs roundup, or to the comparisons hub when it has none',
        id => {
            const expected = ROUNDUPS[id] ?? COMPARISONS_HUB
            const markup = renderToStaticMarkup(
                createElement(FrameworkGuide, { framework: id }),
            )
            const tableEnd = markup.indexOf('</table>')
            const keepReading = markup.indexOf('Keep reading')
            expect(tableEnd).toBeGreaterThan(-1)
            expect(keepReading).toBeGreaterThan(tableEnd)
            expect(docsHrefs(markup.slice(tableEnd, keepReading))).toEqual([
                expected,
            ])
            expect(
                docsHrefs(markup).filter(href => href === expected),
            ).toHaveLength(1)
            expect(
                docsPageUrls().has(expected),
                `${expected} is a real docs page`,
            ).toBe(true)
        },
    )

    it.each(Object.keys(ROUNDUPS) as FrameworkId[])(
        'links the %s docs roundup back to its framework page',
        id => {
            const mdx = readFileSync(
                fileURLToPath(
                    new URL(
                        `../../content${ROUNDUPS[id]}.mdx`,
                        import.meta.url,
                    ),
                ),
                'utf8',
            )
            const siteLinks = [...mdx.matchAll(/\]\((\/[^)\s]*)\)/g)]
                .map(match => match[1])
                .filter(href => !href.startsWith('/docs/'))
            expect(FRAMEWORK_IDS).toContain(id)
            expect(siteLinks).toContain(`/${id}/`)
        },
    )
})

describe('breadcrumb JSON-LD', () => {
    it.each(FRAMEWORK_IDS)(
        'emits Home then "<Framework> File Uploader" breadcrumbs on /%s/',
        async id => {
            const { jsonLd } = renderSeoParts(await frameworkPageTree(id))
            const lists = nodesOfType(jsonLdNodes(jsonLd), 'BreadcrumbList')
            expect(lists).toHaveLength(1)
            expect(lists[0].itemListElement).toEqual([
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: canonicalUrl(),
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: `${FRAMEWORKS[id].name} File Uploader`,
                    item: canonicalUrl(id),
                },
            ])
        },
    )

    it('emits no BreadcrumbList on the home page', () => {
        const { jsonLd } = renderSeoParts(Home())
        expect(nodesOfType(jsonLdNodes(jsonLd), 'BreadcrumbList')).toEqual([])
    })
})
