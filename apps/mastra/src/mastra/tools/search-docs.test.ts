import { describe, expect, it } from 'vitest'
import { parseLlmsFull, scoreChunks } from './search-docs.js'

const CORPUS = [
    '# Getting Started\nhttps://useupup.com/docs/getting-started/\n\nInstall upup with pnpm add @upupjs/react. Then render the uploader.',
    '# Theming\nhttps://useupup.com/docs/guides/theming/\n\nThe theme prop controls colors. Dark mode is supported.',
    '# Resumable Uploads\nhttps://useupup.com/docs/resumable-uploads/\n\nResumable uploads use tus. Configure the tus strategy for large files.',
].join('\n---\n')

describe('parseLlmsFull', () => {
    it('splits the corpus into per-page chunks with title, url, body', () => {
        const chunks = parseLlmsFull(CORPUS)
        expect(chunks).toHaveLength(3)
        expect(chunks[0]).toMatchObject({
            title: 'Getting Started',
            url: 'https://useupup.com/docs/getting-started/',
        })
        expect(chunks[2].body).toContain('tus strategy')
    })
})

describe('scoreChunks', () => {
    it('ranks the page matching the query terms first', () => {
        const ranked = scoreChunks(
            parseLlmsFull(CORPUS),
            'resumable tus large files',
        )
        expect(ranked[0].url).toContain('resumable-uploads')
    })
    it('boosts title matches over body-only matches', () => {
        const ranked = scoreChunks(parseLlmsFull(CORPUS), 'theming')
        expect(ranked[0].url).toContain('theming')
    })
    it('returns an empty array when nothing matches', () => {
        expect(
            scoreChunks(parseLlmsFull(CORPUS), 'zebra xylophone'),
        ).toHaveLength(0)
    })
})
