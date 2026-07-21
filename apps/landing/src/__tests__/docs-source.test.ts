import { describe, expect, it } from 'vitest'
import { source } from '@/lib/docs/source'

describe('docs source', () => {
    it('loads pages from content/docs', () => {
        const pages = source.getPages()
        expect(pages.length).toBeGreaterThan(0)
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
