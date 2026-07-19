import { InteractiveExample } from '@upupjs/interactive-example'
import '@upupjs/interactive-example/styles'
import { interactiveExampleEnvProps } from '@/lib/interactive-example-props'
import HomepageFeatures from '@/components/HomepageFeatures'
import FeedbackSection from '@/components/FeedbackSection'
import Toast from '@/components/Toast'
import HeroSection from '@/components/HomepageHero'
import StackBlitzDemoSection from '@/components/StackBlitzDemoSection'
import StructuredData from '@/components/StructuredData'
import FAQSection from '@/components/FAQSection'
import Section from '@/components/ui/Section'

export const metadata = {
    title: 'upup – One File Uploader for React, Vue, Svelte, Angular, Vanilla JS & Preact',
    description:
        'One open-source, MIT-licensed file uploader with a headless core and byte-identical native UI for six frameworks. Drag-and-drop, cloud drives (Google Drive, OneDrive, Dropbox, Box), camera, screen capture, and secure server-mode uploads to S3-compatible storage.',
    alternates: {
        canonical: 'https://useupup.com/',
    },
}

export default function Home() {
    return (
        <>
            <StructuredData />
            <HeroSection />
            <Section id="demo">
                <InteractiveExample {...interactiveExampleEnvProps()} />
            </Section>
            <HomepageFeatures />
            <StackBlitzDemoSection />
            <FAQSection />
            <FeedbackSection />
            <Toast />
        </>
    )
}
