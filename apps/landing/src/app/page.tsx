import { InteractiveExample } from '@upupjs/interactive-example'
import '@upupjs/interactive-example/styles'
import HomepageFeatures from '@/components/HomepageFeatures'
import FeedbackSection from '@/components/FeedbackSection'
import Toast from '@/components/Toast'
import HeroSection from '@/components/HomepageHero'
import StackBlitzDemoSection from '@/components/StackBlitzDemoSection'
import StructuredData from '@/components/StructuredData'

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
        <div className="container mx-auto">
            <StructuredData />
            <HeroSection />
            <InteractiveExample />
            <HomepageFeatures />
            <StackBlitzDemoSection />
            <FeedbackSection />
            <Toast />
        </div>
    )
}
