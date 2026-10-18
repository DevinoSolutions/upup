import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { env } from '../../lib/env.js'

export interface DocsChunk {
    title: string
    url: string
    body: string
}

/**
 * Parses the deployed llms-full.txt corpus (apps/landing/src/lib/docs/llms.ts
 * `buildLlmsFull()`): pages joined by `\n---\n`, each chunk
 * `# {title}\n{absolute page url}\n\n{body}`.
 */
export function parseLlmsFull(text: string): DocsChunk[] {
    return text
        .split('\n---\n')
        .map(block => {
            const lines = block.trim().split('\n')
            const title = (lines[0] ?? '').replace(/^#\s*/, '').trim()
            const url = (lines[1] ?? '').trim()
            const body = lines.slice(2).join('\n').trim()
            return { title, url, body }
        })
        .filter(c => c.title && c.url.startsWith('http'))
}

const TITLE_BOOST = 5
const PATH_BOOST = 5
const SEGMENT_BOOST = 5
const INTENT_BOOST = 8

// Generic question filler. These words appear on nearly every page, so
// counting them just rewards the longest pages instead of the relevant one.
const STOPWORDS = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'that',
    'this',
    'what',
    'how',
    'can',
    'does',
    'show',
    'tell',
    'give',
    'please',
    'minimal',
    'simple',
    'basic',
    'usage',
    'use',
    'using',
    'code',
    'example',
    'examples',
    'snippet',
    'upup',
    'need',
    'want',
    'about',
    'are',
    'you',
    'your',
    'get',
    'make',
    'work',
])

// Install-style questions belong on the quickstart / getting-started pages,
// whose bodies are short and so lose a pure keyword count to long reference pages.
const INSTALL_INTENT = new Set(['install', 'quickstart', 'started'])
const INSTALL_PATHS = ['/quickstarts/', '/getting-started']

/**
 * Crude, deterministic stemmer so `theme` matches `theming` and `drives`
 * matches `drive`: strip one common suffix, then a trailing `e`. Used for
 * title and URL-path matching, which stays substring-based.
 */
function stem(word: string): string {
    let w = word
    for (const suffix of ['ing', 'es', 'ed', 's']) {
        if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
            w = w.slice(0, -suffix.length)
            break
        }
    }
    return w.length > 3 && w.endsWith('e') ? w.slice(0, -1) : w
}

export function scoreChunks(chunks: DocsChunk[], query: string): DocsChunk[] {
    // Keep 3+ letter words, plus short tokens with a digit (`s3`, `v2`).
    const tokens = query
        .toLowerCase()
        .split(/\W+/)
        .filter(t => t.length > 2 || (t.length === 2 && /\d/.test(t)))
    const meaningful = tokens.filter(t => !STOPWORDS.has(t))
    // A query that is all filler ("what is upup") still has to find something.
    const onlyFiller = meaningful.length === 0
    const terms = onlyFiller ? tokens : meaningful
    if (terms.length === 0) return []
    return chunks
        .map(chunk => {
            const title = chunk.title.toLowerCase()
            const path = urlPath(chunk.url)
            const body = chunk.body.toLowerCase()
            // Raw counts grow with page length; sqrt-normalise so a long page
            // full of generic words cannot outrank a short, on-topic one.
            const lengthNorm = Math.sqrt(Math.max(body.length, 1))
            const segments = path.split('/')
            const installPage = INSTALL_PATHS.some(p => path.includes(p))
            let score = 0
            for (const term of terms) {
                // Stem for title/path (theme -> theming); body counts stay
                // literal so a short stem like "mod" cannot hit "module".
                const root = stem(term)
                if (title.includes(root)) score += TITLE_BOOST
                if (path.includes(root)) score += PATH_BOOST
                if (segments.includes(term)) score += SEGMENT_BOOST
                if (installPage && (onlyFiller || INSTALL_INTENT.has(term)))
                    score += INTENT_BOOST
                score += (body.split(term).length - 1) / lengthNorm
            }
            return { chunk, score }
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.chunk)
}

/** URL path only (e.g. `/docs/quickstarts/react/`), so the host never matches. */
function urlPath(url: string): string {
    try {
        return new URL(url).pathname.toLowerCase()
    } catch {
        return ''
    }
}

const CACHE_TTL_MS = 60 * 60 * 1000
const EXCERPT_MAX = 1500
const TOP_K = 5

let cache: { chunks: DocsChunk[]; fetchedAt: number } | null = null

async function loadCorpus(): Promise<DocsChunk[]> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS)
        return cache.chunks
    const res = await fetch(`${env.DOCS_BASE_URL}/docs/llms-full.txt`)
    if (!res.ok) throw new Error(`docs corpus fetch failed: ${res.status}`)
    cache = { chunks: parseLlmsFull(await res.text()), fetchedAt: Date.now() }
    return cache.chunks
}

export const searchDocs = createTool({
    id: 'search-docs',
    description:
        'Search the upup documentation. Returns the most relevant pages with their URLs and excerpts. ' +
        'Always call this before answering a docs question.',
    inputSchema: z.object({
        query: z
            .string()
            .min(1)
            .describe(
                'The user question or search terms to look up in the docs.',
            ),
    }),
    outputSchema: z.object({
        results: z.array(
            z.object({
                title: z.string(),
                url: z.string(),
                excerpt: z.string(),
            }),
        ),
        error: z.string().optional(),
        detail: z.string().optional(),
    }),
    execute: async ({ query }) => {
        try {
            const ranked = scoreChunks(await loadCorpus(), query)
            return {
                results: ranked.slice(0, TOP_K).map(c => ({
                    title: c.title,
                    url: c.url,
                    excerpt: c.body.slice(0, EXCERPT_MAX),
                })),
            }
        } catch (error) {
            return {
                results: [],
                error: 'Docs search is unavailable right now.',
                detail: error instanceof Error ? error.message : String(error),
            }
        }
    },
})
