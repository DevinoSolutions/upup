import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FRAMEWORK_IDS, getFramework } from '@/lib/frameworks'
import FrameworkLanding from '@/components/FrameworkLanding'

const SITE_URL = 'https://useupup.com'

// Only the known framework slugs render; anything else 404s (static routes like
// /privacy and /mobile-demo still take precedence over this dynamic segment).
export const dynamicParams = false

export function generateStaticParams() {
    return FRAMEWORK_IDS.map(framework => ({ framework }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ framework: string }>
}): Promise<Metadata> {
    const { framework } = await params
    const fw = getFramework(framework)
    if (!fw) return {}

    const title = `${fw.name} File Uploader — upup`
    const description = `${fw.tagline} Open-source & MIT-licensed — npm install ${fw.pkg}.`
    const url = `${SITE_URL}/${fw.id}`
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
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
    }
}

export default async function FrameworkPage({
    params,
}: {
    params: Promise<{ framework: string }>
}) {
    const { framework } = await params
    const fw = getFramework(framework)
    if (!fw) notFound()
    return <FrameworkLanding framework={fw} />
}
