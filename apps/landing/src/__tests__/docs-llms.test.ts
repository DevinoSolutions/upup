import { describe, expect, it } from 'vitest'
import { buildLlmsIndex, buildLlmsFull } from '@/lib/docs/llms'

describe('llms corpus', () => {
    it('index lists every page with absolute /docs URL', () => {
        const text = buildLlmsIndex()
        expect(text).toContain('# upup')
        expect(text).toContain('https://useupup.com/docs/getting-started/')
        expect(text).not.toContain('/documentation/')
    })

    it('full corpus contains page bodies from all sections', () => {
        const full = buildLlmsFull()
        expect(full).toContain('@upupjs/react')
        expect(full).toContain('createUpupHandler')
        // Sanity floor, not exact — catches an empty/truncated corpus.
        expect(full.length).toBeGreaterThan(20_000)
    })

    it('index lists 36 pages and full contains all 36 page bodies', () => {
        // Pinned to the docs page inventory (same count as docs-source.test.ts) —
        // bump deliberately when pages are added/removed.
        const index = buildLlmsIndex()
        const linkCount = (index.match(/^- \[/gm) ?? []).length
        expect(linkCount).toBe(36)

        const full = buildLlmsFull()
        const pageCount = (full.match(/\n---\n/g)?.length ?? 0) + 1
        expect(pageCount).toBe(36)
    })
})
