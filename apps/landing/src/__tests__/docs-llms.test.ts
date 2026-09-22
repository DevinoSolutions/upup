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
        expect(full).toContain('@useupup/react')
        expect(full).toContain('createUpupHandler')
        // Sanity floor, not exact — catches an empty/truncated corpus.
        expect(full.length).toBeGreaterThan(20_000)
    })

    it('index lists 65 pages and full contains all 65 page bodies', () => {
        // Pinned to the docs page inventory (same count as docs-source.test.ts) —
        // bump deliberately when pages are added/removed. 36 + 9 (2026-08
        // coverage sprint) + 19 (2026-08 SEO split: 7 storage + 4 auth +
        // 4 server-adapters + 3 processing + writing-plugins) = 64, + 1
        // (2026-09 FAQ) = 65. The "## Start here" links above the page list are
        // plain lines, not `- [` bullets, so they do not count here.
        const index = buildLlmsIndex()
        const linkCount = (index.match(/^- \[/gm) ?? []).length
        expect(linkCount).toBe(65)

        const full = buildLlmsFull()
        const pageCount = (full.match(/\n---\n/g)?.length ?? 0) + 1
        expect(pageCount).toBe(65)
    })
})
