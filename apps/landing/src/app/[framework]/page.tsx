import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '@useupup/interactive-example/styles'
import DeferredInteractiveExample from '@/components/DeferredInteractiveExample'
import { interactiveExampleEnvProps } from '@/lib/interactive-example-props'
import { FRAMEWORK_IDS, getFramework } from '@/lib/frameworks'
import { faqsFor } from '@/lib/faqs'
import StructuredData from '@/components/StructuredData'
import HeroSection from '@/components/HomepageHero'
import FrameworkGuide from '@/components/FrameworkGuide'
import HomepageFeatures from '@/components/HomepageFeatures'
import StackBlitzDemoSection from '@/components/StackBlitzDemoSection'
import FeedbackSection from '@/components/FeedbackSection'
import FAQSection from '@/components/FAQSection'
import Toast from '@/components/Toast'
import Section from '@/components/ui/Section'
import { canonicalUrl, siteUrl } from '@/lib/site-url'

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

    // "<Framework> File Uploader" leads because that is the phrase the
    // impressions arrive on ("vue file uploader", "react uploader",
    // "angular file uploader"); the brand trails. Widest case is
    // "Vanilla JS" at 57 chars — the ≤60 title and ≤155 description budgets
    // are pinned by src/__tests__/seo-copy-budgets.test.ts.
    const title = `${fw.name} File Uploader – Open-Source Drag & Drop | upup`
    const description = fw.tagline
    const url = canonicalUrl(fw.id)
    const image = `${siteUrl()}/img/social-card.png`

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

// The same layout as the home page (src/app/page.tsx), parameterized by
// framework — never a separate design. Three things differ, all so each page
// carries content of its own instead of duplicating the home page: the
// FrameworkGuide block (quickstart, notes, comparison, docs links), this
// framework's own FAQ set (visible accordion AND FAQPage JSON-LD read the same
// faqsFor() list), and a BreadcrumbList emitted by StructuredData.
export default async function FrameworkPage({
    params,
}: {
    params: Promise<{ framework: string }>
}) {
    const { framework } = await params
    const fw = getFramework(framework)
    if (!fw) notFound()

    return (
        <>
            <StructuredData
                framework={{ id: fw.id, name: fw.name, pkg: fw.pkg }}
            />
            <HeroSection framework={fw.id} />
            <Section id="demo">
                <DeferredInteractiveExample
                    {...interactiveExampleEnvProps(
                        fw.hasImageEditor
                            ? undefined
                            : {
                                  initialConfig: {
                                      imageEditor: { enabled: false },
                                  },
                                  hiddenCategories: ['editor'],
                                  showCodeTab: false,
                              },
                    )}
                />
            </Section>
            <FrameworkGuide framework={fw.id} />
            <HomepageFeatures />
            {fw.id === 'react' && <StackBlitzDemoSection />}
            <FAQSection items={faqsFor(fw.id)} frameworkName={fw.name} />
            <FeedbackSection />
            <Toast />
        </>
    )
}
