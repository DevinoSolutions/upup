import { describe, expect, it } from 'vitest'
import { source } from '@/lib/docs/source'

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
})
