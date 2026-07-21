import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { source } from '@/lib/docs/source'
import { getMDXComponents } from '@/components/docs/mdx-components'

export function generateStaticParams() {
    return source.generateParams()
}

export async function generateMetadata(props: {
    params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
    const { slug } = await props.params
    const page = source.getPage(slug)
    if (!page) return {}
    return {
        title: `${page.data.title} | upup docs`,
        description: page.data.description,
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
