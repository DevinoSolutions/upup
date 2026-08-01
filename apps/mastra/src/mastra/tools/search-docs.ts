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

export function scoreChunks(chunks: DocsChunk[], query: string): DocsChunk[] {
    const terms = query
        .toLowerCase()
        .split(/\W+/)
        .filter(t => t.length > 2)
    if (terms.length === 0) return []
    return chunks
        .map(chunk => {
            const title = chunk.title.toLowerCase()
            const body = chunk.body.toLowerCase()
            let score = 0
            for (const term of terms) {
                if (title.includes(term)) score += TITLE_BOOST
                score += body.split(term).length - 1
            }
            return { chunk, score }
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.chunk)
}

const CACHE_TTL_MS = 60 * 60 * 1000
const EXCERPT_MAX = 1500
const TOP_K = 4

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
