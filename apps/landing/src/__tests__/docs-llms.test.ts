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
        expect(full.length).toBeGreaterThan(20_000)
    })

    it('index and full cover the same 36 pages', () => {
        const index = buildLlmsIndex()
        const linkCount = (index.match(/^- \[/gm) ?? []).length
        expect(linkCount).toBe(36)
    })
})
