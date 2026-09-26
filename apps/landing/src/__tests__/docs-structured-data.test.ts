import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
    GET as markdownTwin,
    generateStaticParams as markdownTwinParams,
} from '@/app/docs-md/[[...slug]]/route'
import sitemap from '@/app/sitemap'
import { DocsStructuredData } from '@/components/docs/DocsStructuredData'
import { buildLlmsIndex, slugFromPath } from '@/lib/docs/llms'
import { findTrail, normalizeUrl, toSidebarTree } from '@/lib/docs/sidebar-tree'
import { source } from '@/lib/docs/source'

// The per-docs-page JSON-LD, the FAQPage built from `faq:` frontmatter, and
// the folder hub pages that give the breadcrumb's middle crumbs a real URL.
// Search Console (90 days to 2026-09) showed "upup" as the site's only
// clicking query at position 6.3 — these pins keep the machine-readable side
// of the docs honest as the corpus grows.

const PRODUCTION_ORIGIN = 'https://useupup.com'
const CONTENT_DIR = new URL('../../content/docs/', import.meta.url)

const HUBS = [
    { slug: ['guides'], dir: 'guides' },
    { slug: ['guides', 'storage'], dir: 'guides/storage' },
    { slug: ['quickstarts'], dir: 'quickstarts' },
    { slug: ['comparisons'], dir: 'comparisons' },
] as const

const tree = toSidebarTree(source.pageTree)

function readContent(relative: string): string {
    return readFileSync(fileURLToPath(new URL(relative, CONTENT_DIR)), 'utf8')
}

function renderGraph(props: Parameters<typeof DocsStructuredData>[0]) {
    const markup = renderToStaticMarkup(
        createElement(DocsStructuredData, props),
    )
    const match = markup.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    )
    expect(match, 'no JSON-LD script rendered').not.toBeNull()
    const doc = JSON.parse((match as RegExpMatchArray)[1]) as {
        '@graph': Record<string, unknown>[]
    }
    return doc['@graph']
}

function propsFor(slug: string[]) {
    const page = source.getPage(slug)
    expect(page, `no docs page at ${slug.join('/')}`).toBeDefined()
    const data = page!.data
    return {
        tree,
        url: `/docs/${slug.join('/')}`,
        title: data.title,
        description: data.description,
        faq: data.faq,
    }
}

/** Markdown source reduced to the text a reader sees: no links, no code ticks. */
function visibleText(markdown: string): string {
    return markdown
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

/** faq.mdx body split into `{ heading, text }` sections at each `## `. */
function faqSections(): { heading: string; text: string }[] {
    const body = readContent('faq.mdx').replace(/^---\n[\s\S]*?\n---\n/, '')
    return body
        .split(/^## /m)
        .slice(1)
        .map(section => {
            const [heading, ...rest] = section.split('\n')
            return {
                heading: visibleText(heading),
                text: visibleText(rest.join('\n')),
            }
        })
}

describe('docs FAQPage JSON-LD mirrors the visible FAQ', () => {
    const faq = source.getPage(['faq'])?.data.faq ?? []
    const sections = faqSections()

    it('carries one faq frontmatter entry per question heading, in page order', () => {
        expect(sections).toHaveLength(12)
        expect(faq.map(item => item.q)).toEqual(
            sections.map(section => section.heading),
        )
    })

    it('draws every answer sentence from the text under its question', () => {
        const unmatched: string[] = []
        faq.forEach((item, i) => {
            for (const sentence of item.a.split(/(?<=\.)\s+/)) {
                const needle = sentence.replace(/\.$/, '')
                if (!sections[i].text.includes(needle))
                    unmatched.push(`${item.q} -> ${needle}`)
            }
        })
        expect(unmatched).toEqual([])
    })

    it('emits a FAQPage node with a Question and Answer per entry on /docs/faq/', () => {
        const graph = renderGraph(propsFor(['faq']))
        const faqPage = graph.find(node => node['@type'] === 'FAQPage')
        expect(faqPage, 'no FAQPage node on /docs/faq/').toBeDefined()
        expect(faqPage?.['@id']).toBe(`${PRODUCTION_ORIGIN}/docs/faq/#faq`)
        expect(faqPage?.isPartOf).toEqual({
            '@id': `${PRODUCTION_ORIGIN}/#website`,
        })
        const questions = faqPage?.mainEntity as {
            '@type': string
            name: string
            acceptedAnswer: { '@type': string; text: string }
        }[]
        expect(questions).toHaveLength(12)
        expect(questions.map(q => q.name)).toEqual(faq.map(item => item.q))
        for (const [i, question] of questions.entries()) {
            expect(question['@type']).toBe('Question')
            expect(question.acceptedAnswer).toEqual({
                '@type': 'Answer',
                text: faq[i].a,
            })
        }
    })

    it('emits no FAQPage node for a docs page without faq frontmatter', () => {
        const withFaq = source
            .getPages()
            .filter(page => page.data.faq !== undefined)
            .map(page => page.url)
        expect(withFaq).toEqual(['/docs/faq'])

        const graph = renderGraph(propsFor(['getting-started']))
        expect(graph.map(node => node['@type'])).toEqual([
            'BreadcrumbList',
            'TechArticle',
        ])
    })
})

describe('docs folder hub pages', () => {
    it.each(HUBS)(
        'serves /docs/$dir/ as a page listed in the sitemap',
        ({ slug }) => {
            const page = source.getPage([...slug])
            expect(page, `no hub page for ${slug.join('/')}`).toBeDefined()
            expect(page?.data.body).toBeDefined()
            const urls = sitemap().map(entry => entry.url)
            expect(urls).toContain(
                `${PRODUCTION_ORIGIN}/docs/${slug.join('/')}/`,
            )
        },
    )

    it.each(HUBS)('links every child of $dir from its hub', ({ dir }) => {
        const hub = readContent(`${dir}/index.mdx`)
        const prefix = `/docs/${dir}/`
        // Pages inside a nested folder that has its own hub (guides/storage/*
        // under guides) are reached through that hub, which the parent links.
        const nestedHubs = HUBS.map(other => `/docs/${other.dir}/`).filter(
            other => other !== prefix && other.startsWith(prefix),
        )
        const children = source
            .getPages()
            .map(page => normalizeUrl(page.url))
            .filter(url => url.startsWith(prefix))
            .filter(url => !nestedHubs.some(other => url.startsWith(other)))
        expect(children.length).toBeGreaterThan(0)
        const missing = children.filter(url => !hub.includes(`](${url}/)`))
        expect(missing).toEqual([])
    })

    it('gives the breadcrumb middle crumbs real URLs on a nested page', () => {
        const trail = findTrail(tree, '/docs/guides/storage/aws-s3') ?? []
        expect(trail.map(node => node.name)).toEqual([
            'Guides',
            'Storage',
            'Upload files to Amazon S3',
        ])
        expect(trail.map(node => normalizeUrl(node.url ?? ''))).toEqual([
            '/docs/guides',
            '/docs/guides/storage',
            '/docs/guides/storage/aws-s3',
        ])

        const graph = renderGraph(propsFor(['guides', 'storage', 'aws-s3']))
        const breadcrumbs = graph.find(
            node => node['@type'] === 'BreadcrumbList',
        )
        const items = breadcrumbs?.itemListElement as {
            name: string
            item?: string
        }[]
        expect(items.map(item => item.item)).toEqual([
            `${PRODUCTION_ORIGIN}/docs/`,
            `${PRODUCTION_ORIGIN}/docs/guides/`,
            `${PRODUCTION_ORIGIN}/docs/guides/storage/`,
            `${PRODUCTION_ORIGIN}/docs/guides/storage/aws-s3/`,
        ])
    })
})

describe('nested index pages map to their folder slug in the agent surfaces', () => {
    it('strips a trailing index segment at any depth', () => {
        const file = (relative: string) =>
            fileURLToPath(new URL(relative, CONTENT_DIR))
        expect(slugFromPath(file('index.mdx'))).toBe('')
        expect(slugFromPath(file('guides/index.mdx'))).toBe('guides')
        expect(slugFromPath(file('guides/storage/index.mdx'))).toBe(
            'guides/storage',
        )
        expect(slugFromPath(file('guides/theming.mdx'))).toBe('guides/theming')
    })

    it('lists each hub at its folder URL in llms.txt, never at /index/', () => {
        const index = buildLlmsIndex()
        for (const { slug } of HUBS) {
            expect(index).toContain(
                `](${PRODUCTION_ORIGIN}/docs/${slug.join('/')}/)`,
            )
        }
        expect(index).not.toContain('/index/')
    })

    it('generates and serves a markdown twin for each hub at its folder slug', async () => {
        const params = markdownTwinParams().map(param => param.slug.join('/'))
        expect(params.filter(slug => /(^|\/)index$/.test(slug))).toEqual([])
        for (const { slug } of HUBS) {
            expect(params).toContain(slug.join('/'))
        }

        const res = await markdownTwin(
            new Request(`${PRODUCTION_ORIGIN}/docs-md/guides/storage/`),
            { params: Promise.resolve({ slug: ['guides', 'storage'] }) },
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('link')).toBe(
            `<${PRODUCTION_ORIGIN}/docs/guides/storage/>; rel="canonical"`,
        )
        expect(await res.text()).toMatch(/^# Storage provider guides\n/)
    })
})
