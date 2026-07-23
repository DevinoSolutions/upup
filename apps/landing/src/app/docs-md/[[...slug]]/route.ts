import { loadPages } from '@/lib/docs/llms'

// One raw-markdown endpoint per docs page, consumed by the "Copy page" button.
// Frozen at build time like the llms.txt routes — a docs edit appears only
// after rebuild/redeploy. dynamicParams:false so anything not generated from
// content/docs 404s rather than rendering dynamically.
export const dynamic = 'force-static'
export const dynamicParams = false

// slug '' (the /docs root) -> []; 'guides/theming' -> ['guides','theming'].
export function generateStaticParams(): { slug: string[] }[] {
    return loadPages().map(page => ({
        slug: page.slug ? page.slug.split('/') : [],
    }))
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug?: string[] }> },
) {
    const { slug } = await params
    const target = slug?.length ? slug.join('/') : ''
    const page = loadPages().find(p => p.slug === target)
    if (!page) {
        return new Response('Not found', { status: 404 })
    }
    // Self-contained markdown: the page body carries no top-level H1 (the title
    // lives in frontmatter and is rendered as the <h1> on the article page), so
    // prepend it — mirrors buildLlmsFull's per-page shape.
    const markdown = `# ${page.title}\n\n${page.body}\n`
    return new Response(markdown, {
        headers: { 'content-type': 'text/markdown; charset=utf-8' },
    })
}
