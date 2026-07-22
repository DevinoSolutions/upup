import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { source } from '@/lib/docs/source'
import { nodeToText, toSidebarTree } from '@/lib/docs/sidebar-tree'
import { getMDXComponents } from '@/components/docs/mdx-components'
import { DocsBreadcrumb } from '@/components/docs/DocsBreadcrumb'
import { DocsToc } from '@/components/docs/DocsToc'
import { DocsHome } from '@/components/docs/DocsHome'

const SITE_URL = 'https://useupup.com'

// content/docs is the only source of docs slugs; anything not generated
// from it 404s rather than falling through to a dynamic render.
export const dynamicParams = false

export function generateStaticParams() {
    return source.generateParams()
}

export async function generateMetadata(props: {
    params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
    const { slug } = await props.params
    const page = source.getPage(slug)
    if (!page) return {}

    const title = `${page.data.title} | upup docs`
    const description = page.data.description
    const url = `${SITE_URL}/docs${slug?.length ? `/${slug.join('/')}` : ''}`
    const image = 'https://useupup.com/img/social-card.png'

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            siteName: 'upup',
            images: [image],
        },
    }
}

export default async function DocsPage(props: {
    params: Promise<{ slug?: string[] }>
}) {
    const { slug } = await props.params
    const page = source.getPage(slug)
    if (!page) notFound()
    if (!slug?.length) return <DocsHome />
    const MDX = page.data.body
    const tree = toSidebarTree(source.pageTree)
    const url = `/docs${slug?.length ? `/${slug.join('/')}` : ''}`
    // TOC titles are ReactNode in fumadocs — flatten to strings before they
    // cross into the client <DocsToc>.
    const toc = page.data.toc.map(item => ({
        title: nodeToText(item.title),
        url: item.url,
        depth: item.depth,
    }))

    return (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-10">
            <div className="min-w-0">
                <DocsBreadcrumb tree={tree} url={url} />
                {/* prose-code:before/after content-none: the typography
                    plugin's default renders literal backtick glyphs around
                    inline code; the chip styling replaces them, scoped via
                    :not(pre)>code so fenced blocks keep their own styling. */}
                <article className="prose max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 prose-code:before:content-none prose-code:after:content-none [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-black/[0.06] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-normal dark:[&_:not(pre)>code]:bg-white/10">
                    <h1>{page.data.title}</h1>
                    <MDX components={getMDXComponents()} />
                </article>
            </div>
            <aside className="hidden lg:block">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
                    <DocsToc items={toc} />
                </div>
            </aside>
        </div>
    )
}
