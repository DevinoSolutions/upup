import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { source } from '@/lib/docs/source'

const CONTENT_DIR = fileURLToPath(
    new URL('../../content/docs', import.meta.url),
)

function mdxFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) return mdxFiles(full)
        return entry.name.endsWith('.mdx') ? [full] : []
    })
}

describe('docs source', () => {
    it('loads pages from content/docs', () => {
        const pages = source.getPages()
        // Exact count of .mdx files under content/docs — a page added or
        // dropped without updating this pin is a real inventory change.
        // 15 (batch A) + 16 (batch B) + 4 (comparisons) + 1 (migration) = 36.
        expect(pages.length).toBe(36)
        const indexPage = source.getPage([]) // index.mdx
        expect(indexPage).toBeDefined()
        expect(indexPage?.data.body).toBeDefined()
    })

    it('every page has title frontmatter', () => {
        for (const page of source.getPages()) {
            expect(page.data.title, `${page.path} missing title`).toBeTruthy()
        }
    })

    it('every internal /docs link in the corpus resolves to a real page', () => {
        // Section folders (quickstarts/, guides/, api-reference/, ...) have NO
        // index pages — a link to a bare section URL 404s in production (and
        // next/link prefetch surfaces it as a console error on every page that
        // renders the link). This walked twice before this pin existed.
        const validUrls = new Set(
            source
                .getPages()
                .map(page => page.url.replace(/\/$/, ''))
                .concat(['/docs/llms.txt', '/docs/llms-full.txt']),
        )
        const broken: string[] = []
        for (const file of mdxFiles(CONTENT_DIR)) {
            const raw = readFileSync(file, 'utf8')
            for (const match of raw.matchAll(/\]\((\/docs\/[^)#\s]*)/g)) {
                const target = match[1].replace(/\/$/, '')
                if (!validUrls.has(target)) {
                    broken.push(`${file} -> ${match[1]}`)
                }
            }
        }
        expect(broken).toEqual([])
    })
})
