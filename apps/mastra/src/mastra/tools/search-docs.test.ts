import { describe, expect, it } from 'vitest'
import { parseLlmsFull, scoreChunks, stem } from './search-docs.js'

const CORPUS = [
    '# Getting Started\nhttps://useupup.com/docs/getting-started/\n\nInstall upup with pnpm add @useupup/react. Then render the uploader.',
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

const pad = (word: string, n: number) => Array(n).fill(word).join(' ')

// Mimics the shape of the real llms-full.txt: long server/azure/migration
// pages stuffed with generic words, short quickstart pages.
const REAL_SHAPED = [
    `# Server Mode Setup\nhttps://useupup.com/docs/server-mode-setup/\n\nSet up the server handler. ${pad('react install code usage minimal handler presign route', 120)} Configure the HMAC secret and storage.`,
    `# Azure Blob Storage\nhttps://useupup.com/docs/azure-blob/\n\n${pad('install code usage react azure container sas token', 150)}`,
    `# Migration Guide\nhttps://useupup.com/docs/migration/\n\n${pad('react install code usage upgrade rename removed', 130)}`,
    '# Getting Started\nhttps://useupup.com/docs/getting-started/\n\nInstall upup with pnpm add @useupup/react, then render the uploader component.',
    '# Framework quickstarts\nhttps://useupup.com/docs/quickstarts/react/\n\nReact quickstart: install @useupup/react and use the UpupUploader component.',
].join('\n---\n')

describe('scoreChunks on a real-shaped corpus', () => {
    const chunks = parseLlmsFull(REAL_SHAPED)

    it('surfaces a quickstart page in the top 3 for a generic install question', () => {
        const top3 = scoreChunks(
            chunks,
            'Show the minimal React install and usage code for upup',
        )
            .slice(0, 3)
            .map(c => c.url)
        expect(
            top3.some(
                u =>
                    u.includes('/getting-started/') ||
                    u.includes('/quickstarts/react/'),
            ),
        ).toBe(true)
    })

    it('still ranks server-mode-setup first for a server-mode query', () => {
        const ranked = scoreChunks(
            chunks,
            'how do I set up server mode handler with HMAC secret',
        )
        expect(ranked[0].url).toContain('server-mode-setup')
    })

    it('falls back to the raw words when a query is all filler', () => {
        expect(scoreChunks(chunks, 'what is upup').length).toBeGreaterThan(0)
    })

    it('does not treat "setup" as install intent for storage questions', () => {
        const quickstart = (fw: string) =>
            `# Framework quickstarts\nhttps://useupup.com/docs/quickstarts/${fw}/\n\n${fw} quickstart setup: install @useupup/${fw} and render the uploader.`
        const withStorage = parseLlmsFull(
            [
                REAL_SHAPED,
                '# Storage providers\nhttps://useupup.com/docs/guides/storage/aws-s3/\n\nS3 setup: create a bucket, set CORS, and add the credentials to the server handler.',
                ...['vue', 'svelte', 'next', 'angular'].map(quickstart),
            ].join('\n---\n'),
        )
        const top3 = scoreChunks(withStorage, 'S3 setup')
            .slice(0, 3)
            .map(c => c.url)
        expect(top3.some(u => u.includes('/storage/aws-s3/'))).toBe(true)
        expect(top3.every(u => u.includes('/quickstarts/'))).toBe(false)
    })

    it('matches theme to theming via light stemming', () => {
        const themed = parseLlmsFull(
            [
                REAL_SHAPED,
                '# Theming\nhttps://useupup.com/docs/guides/theming/\n\nCustomize colors and dark mode.',
            ].join('\n---\n'),
        )
        expect(scoreChunks(themed, 'theme dark mode')[0].url).toContain(
            '/theming/',
        )
    })
})

// Titles and paths mirror the live corpus: server-mode-setup's title carries
// only "Server", quickstart titles all contain "Quickstart", and the
// comparison pages have "File Upload" in both title and path.
const LIVE_SHAPED = [
    `# Secure S3 File Upload Server for Node.js and Next.js\nhttps://useupup.com/docs/guides/server-mode-setup/\n\nSet up server mode: ${pad('server handler presign route', 40)} Configure the HMAC secret.`,
    '# Getting Started\nhttps://useupup.com/docs/getting-started/\n\nInstall upup with pnpm add @useupup/react, then render the uploader.',
    '# Framework quickstarts\nhttps://useupup.com/docs/quickstarts/\n\nPick a framework quickstart.',
    ...['React', 'Next.js', 'Vue', 'Svelte', 'Vanilla JS', 'Angular'].map(
        fw =>
            `# ${fw} Quickstart\nhttps://useupup.com/docs/quickstarts/${fw.toLowerCase().replace(/\W/g, '')}/\n\nInstall @useupup and render the uploader in ${fw}.`,
    ),
    `# Best React File Upload Libraries\nhttps://useupup.com/docs/comparisons/best-react-file-upload-libraries/\n\n${pad('upload files upload file uploader', 80)}`,
    `# UPUP vs ng2-file-upload\nhttps://useupup.com/docs/comparisons/upup-vs-ng2-file-upload/\n\n${pad('upload files file uploader', 80)}`,
    `# HEIC Conversion\nhttps://useupup.com/docs/guides/heic-conversion/\n\n${pad('pnpm add libheif-js npm install pnpm install', 12)}`,
    `# Express Adapter\nhttps://useupup.com/docs/guides/server-adapters/express/\n\n${pad('pnpm add express npm install pnpm', 12)}`,
    ...['Hono', 'Fastify', 'Resumable Uploads'].map(
        name =>
            `# ${name}\nhttps://useupup.com/docs/guides/${name.toLowerCase().replace(/\W/g, '-')}/\n\n${pad('pnpm add npm install pnpm install', 12)}`,
    ),
    '# Backblaze B2\nhttps://useupup.com/docs/guides/storage/backblaze-b2/\n\nUse Backblaze B2 as S3-compatible storage: create a bucket and an application key.',
].join('\n---\n')

describe('scoreChunks ranking follow-ups (T-3644)', () => {
    const chunks = parseLlmsFull(LIVE_SHAPED)
    const top = (query: string, n: number) =>
        scoreChunks(chunks, query)
            .slice(0, n)
            .map(c => c.url)

    it('keeps server-mode-setup in the top 3 for "getting started with server mode"', () => {
        expect(
            top('getting started with server mode', 3).some(u =>
                u.includes('server-mode-setup'),
            ),
        ).toBe(true)
    })

    it('still boosts quickstarts when the other terms match them', () => {
        expect(top('React install', 1)[0]).toContain('/quickstarts/react/')
    })

    it('keeps install pages ahead of "upup vs" pages for an all-filler query', () => {
        const first = top('what is upup', 1)[0]
        expect(
            first.includes('/quickstarts/') ||
                first.includes('/getting-started/'),
        ).toBe(true)
    })

    it.each(['how do I install upup with pnpm', 'npm install upup'])(
        'keeps an install page in the top 3 for "%s"',
        query => {
            expect(
                top(query, 3).some(
                    u =>
                        u.includes('/quickstarts/') ||
                        u.includes('/getting-started/'),
                ),
            ).toBe(true)
        },
    )

    it('does not title/path-boost generic terms, so a named provider wins', () => {
        expect(top('upload files to backblaze', 1)[0]).toContain(
            '/storage/backblaze-b2/',
        )
    })
})

describe('stem', () => {
    it('keeps "files" as "file" instead of the over-stripped "fil"', () => {
        expect(stem('files')).toBe('file')
    })
    it('still maps theme and theming to one root', () => {
        expect(stem('theme')).toBe(stem('theming'))
    })
    it('pins the edge stems', () => {
        expect(stem('uses')).toBe('use')
        expect(stem('axes')).toBe('axe')
        expect(stem('images')).toBe('imag')
        expect(stem('images')).toBe(stem('image'))
    })
    it('strips "es" only after sibilants', () => {
        expect(stem('boxes')).toBe('box')
        expect(stem('matches')).toBe('match')
    })
})
