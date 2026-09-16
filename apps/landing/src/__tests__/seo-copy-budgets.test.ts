import { describe, expect, it } from 'vitest'
import { generateMetadata as frameworkMetadata } from '@/app/[framework]/page'
import { metadata as homeMetadata } from '@/app/page'
import { FRAMEWORK_IDS, FRAMEWORKS } from '@/lib/frameworks'
import { siteConfig } from '@/lib/siteConfig'
import { source } from '@/lib/docs/source'

// Search Console (90 days to 2026-09-08, sc-domain:useupup.com) showed the
// money pages earning impressions and almost no clicks with titles Google
// truncated and descriptions two to three times the width a SERP renders.
// These are the widths that actually display, so a future copy edit that
// blows past them fails here instead of silently costing clicks.
const MAX_TITLE = 60
const MAX_DOCS_TITLE = 65 // frontmatter title + the " | upup docs" template
const DOCS_TITLE_TEMPLATE_SUFFIX = ' | upup docs'
const MIN_DESCRIPTION = 120
const MAX_DESCRIPTION = 160

// A separate PR removes this claim from the marketing copy; nothing may
// reintroduce it through a title or a description.
const RETIRED_CLAIM = 'byte-identical'

function textOf(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

describe('home page search-result copy', () => {
    it('renders a title short enough to survive SERP truncation', () => {
        expect(homeMetadata.title.length).toBeLessThanOrEqual(MAX_TITLE)
    })

    it('leads the title with the brand, which is the site top query', () => {
        expect(homeMetadata.title.startsWith('upup')).toBe(true)
    })

    it('renders a description inside the width Google displays', () => {
        expect(homeMetadata.description.length).toBeGreaterThanOrEqual(
            MIN_DESCRIPTION,
        )
        expect(homeMetadata.description.length).toBeLessThanOrEqual(
            MAX_DESCRIPTION,
        )
    })

    it('keeps the site-wide fallback title and tagline inside the same budgets', () => {
        // layout.tsx serves these to every route that declares no metadata of
        // its own, so they are search-result copy too.
        expect(siteConfig.title.length).toBeLessThanOrEqual(MAX_TITLE)
        expect(siteConfig.tagline.length).toBeGreaterThanOrEqual(
            MIN_DESCRIPTION,
        )
        expect(siteConfig.tagline.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
    })
})

describe('framework page search-result copy', () => {
    it.each(FRAMEWORK_IDS)(
        'gives /%s/ a title inside the 60-character budget',
        async id => {
            const meta = await frameworkMetadata({
                params: Promise.resolve({ framework: id }),
            })
            expect(textOf(meta.title).length).toBeLessThanOrEqual(MAX_TITLE)
        },
    )

    it.each(FRAMEWORK_IDS)(
        'leads the /%s/ title with the phrase the impressions arrive on',
        async id => {
            const meta = await frameworkMetadata({
                params: Promise.resolve({ framework: id }),
            })
            // "vue file uploader", "react uploader", "angular file uploader" —
            // the query language has to be in front of the brand, not behind it.
            expect(textOf(meta.title)).toContain(
                `${FRAMEWORKS[id].name} File Uploader`,
            )
        },
    )

    it.each(FRAMEWORK_IDS)(
        'gives /%s/ a description between 120 and 160 characters',
        async id => {
            const meta = await frameworkMetadata({
                params: Promise.resolve({ framework: id }),
            })
            const description = textOf(meta.description)
            expect(description.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION)
            expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
        },
    )

    it.each(FRAMEWORK_IDS)(
        'names the install command for /%s/ in its description',
        async id => {
            const meta = await frameworkMetadata({
                params: Promise.resolve({ framework: id }),
            })
            expect(textOf(meta.description)).toContain(
                `npm install ${FRAMEWORKS[id].pkg}`,
            )
        },
    )
})

describe('docs frontmatter search-result copy', () => {
    it('keeps every docs title inside 65 characters once the template is appended', () => {
        const overBudget = source
            .getPages()
            .map(page => ({
                url: page.url,
                rendered: `${page.data.title}${DOCS_TITLE_TEMPLATE_SUFFIX}`,
            }))
            .filter(entry => entry.rendered.length > MAX_DOCS_TITLE)
            .map(entry => `${entry.url} (${entry.rendered.length})`)
        expect(overBudget).toEqual([])
    })

    it('keeps every docs description that exists inside 160 characters', () => {
        const overBudget = source
            .getPages()
            .map(page => ({
                url: page.url,
                description: textOf(page.data.description),
            }))
            .filter(entry => entry.description.length > MAX_DESCRIPTION)
            .map(entry => `${entry.url} (${entry.description.length})`)
        expect(overBudget).toEqual([])
    })
})

describe('retired parity claim', () => {
    it('is absent from every title and description the site emits', async () => {
        const copy: string[] = [
            homeMetadata.title,
            homeMetadata.description,
            siteConfig.title,
            siteConfig.tagline,
        ]
        for (const id of FRAMEWORK_IDS) {
            const meta = await frameworkMetadata({
                params: Promise.resolve({ framework: id }),
            })
            copy.push(textOf(meta.title), textOf(meta.description))
        }
        for (const page of source.getPages()) {
            copy.push(page.data.title, textOf(page.data.description))
        }
        const offenders = copy.filter(text =>
            text.toLowerCase().includes(RETIRED_CLAIM),
        )
        expect(offenders).toEqual([])
    })
})
