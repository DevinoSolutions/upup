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
import { canonicalUrl, siteUrl } from '@/lib/site-url'
import {
    HOME_DESCRIPTION,
    HOME_MARKDOWN_PATH,
    HOME_TITLE,
} from '@/lib/home-page'

// Title and description live in src/lib/home-page.ts, shared with the page's
// Markdown twin; their length budgets are pinned by seo-copy-budgets.test.ts.
export const metadata = {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: {
        canonical: canonicalUrl(),
        // <link rel="alternate" type="text/markdown">: the home page's
        // Markdown twin (src/app/index.md/route.ts), the same thing the `/`
        // Link header in next.config.mjs says.
        types: { 'text/markdown': `${siteUrl()}${HOME_MARKDOWN_PATH}` },
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
