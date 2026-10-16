import '@useupup/interactive-example/styles'
import DeferredInteractiveExample from '@/components/DeferredInteractiveExample'
import { interactiveExampleEnvProps } from '@/lib/interactive-example-props'
import HomepageFeatures from '@/components/HomepageFeatures'
import FeedbackSection from '@/components/FeedbackSection'
import Toast from '@/components/Toast'
import HeroSection from '@/components/HomepageHero'
import StackBlitzDemoSection from '@/components/StackBlitzDemoSection'
import StructuredData from '@/components/StructuredData'
import FAQSection from '@/components/FAQSection'
import Section from '@/components/ui/Section'
import { canonicalUrl } from '@/lib/site-url'

// Title is brand-first and ≤60 chars ("upup" is the site's biggest query and
// the old 77-char title truncated in SERPs); description is ≤155 so it renders
// whole. Both budgets are pinned by src/__tests__/seo-copy-budgets.test.ts.
export const metadata = {
    title: 'upup – Open-Source File Uploader | npm @useupup',
    description:
        'upup is a free, MIT-licensed file uploader on npm as @useupup. Drag and drop UI for React, Vue, Svelte, Angular, Vanilla JS and Preact, with S3 uploads.',
    alternates: {
        canonical: canonicalUrl(),
    },
}

export default function Home() {
    return (
        <>
            <StructuredData />
            <HeroSection />
            <Section id="demo">
                <DeferredInteractiveExample {...interactiveExampleEnvProps()} />
            </Section>
            <HomepageFeatures />
            <StackBlitzDemoSection />
            <FAQSection />
            <FeedbackSection />
            <Toast />
        </>
    )
}
