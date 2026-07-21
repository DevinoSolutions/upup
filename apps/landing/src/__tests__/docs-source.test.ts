import { describe, expect, it } from 'vitest'
import { source } from '@/lib/docs/source'

describe('docs source', () => {
    it('loads pages from content/docs', () => {
        const pages = source.getPages()
        expect(pages.length).toBeGreaterThan(0)
        expect(source.getPage([])).toBeDefined() // index.mdx
    })

    it('every page has title frontmatter', () => {
        for (const page of source.getPages()) {
            expect(page.data.title, `${page.path} missing title`).toBeTruthy()
        }
    })
})
