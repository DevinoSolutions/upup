import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { clientEnv } from '@/lib/env'

// Filesystem-based (not fumadocs-based) so this works identically under
// vitest and under Next — fumadocs' `.source/server` is a generated file
// that only exists after `next dev`/`next build` has run once. Anchored via
// import.meta.url (the same pattern next.config.mjs uses) rather than
// process.cwd(), which differs between vitest's and Next's working dirs.
const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(__dirname, '../../../content/docs')
const DEFAULT_BASE_URL = 'https://useupup.com'

interface DocPage {
    slug: string
    title: string
    description: string
    body: string
}

function walk(dir: string): string[] {
    const files: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) files.push(...walk(full))
        else if (entry.name.endsWith('.mdx')) files.push(full)
    }
    return files
}

// content/docs/index.mdx -> '' (the /docs/ root); everything else keeps its
// relative path minus the extension, forward-slashed for the URL.
function slugFromPath(filePath: string): string {
    const rel = relative(CONTENT_DIR, filePath).split(sep).join('/')
    const withoutExt = rel.replace(/\.mdx$/, '')
    return withoutExt === 'index' ? '' : withoutExt
}

function baseUrl(): string {
    return clientEnv.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL
}

function pageUrl(slug: string): string {
    return slug ? `${baseUrl()}/docs/${slug}/` : `${baseUrl()}/docs/`
}

function loadPages(): DocPage[] {
    return walk(CONTENT_DIR)
        .sort()
        .map(file => {
            const { data, content } = matter(readFileSync(file, 'utf-8'))
            return {
                slug: slugFromPath(file),
                title: String(data.title ?? ''),
                description: String(data.description ?? ''),
                body: content.trim(),
            }
        })
}

export function buildLlmsIndex(): string {
    const lines = [
        '# upup',
        '',
        'upup is an MIT-licensed, self-hosted file uploader: one headless core plus',
        'native, DOM-identical UI packages for React, Vue, Svelte, Angular, Vanilla JS,',
        'and Preact, with optional server-mode uploads and cloud-drive sources.',
        '',
        '## Docs',
        '',
        ...loadPages().map(
            page =>
                `- [${page.title}](${pageUrl(page.slug)}): ${page.description}`,
        ),
    ]
    return lines.join('\n') + '\n'
}

export function buildLlmsFull(): string {
    return loadPages()
        .map(page => `# ${page.title}\n${pageUrl(page.slug)}\n\n${page.body}`)
        .join('\n---\n')
}
