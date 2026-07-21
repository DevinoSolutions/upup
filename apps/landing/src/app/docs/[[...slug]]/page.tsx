import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { source } from '@/lib/docs/source'
import { getMDXComponents } from '@/components/docs/mdx-components'

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
    const MDX = page.data.body
    return (
        <article className="prose prose-invert min-w-0 max-w-none">
            <h1>{page.data.title}</h1>
            <MDX components={getMDXComponents()} />
        </article>
    )
}
