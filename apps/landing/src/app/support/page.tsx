import type { Metadata } from 'next'
import Section from '@/components/ui/Section'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'
import SupportForm from './SupportForm'

export const metadata: Metadata = {
    title: 'Support — upup',
    description:
        'Report a problem, request a feature, or ask a question about upup. Your message reaches the team directly.',
}

export default function SupportPage() {
    return (
        <main className="min-h-[70vh] bg-[var(--bg-base)]">
            <Section>
                <SectionHeading
                    badge={
                        <>
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            We&apos;re listening
                        </>
                    }
                    title={
                        <>
                            Get <span className={GRADIENT_TEXT}>support</span>
                        </>
                    }
                    subtitle="Tell us what's going on — a bug, a feature idea, or a question. It all reaches the team."
                />
                <div className="mx-auto w-full max-w-2xl">
                    <SupportForm />
                </div>
            </Section>
        </main>
    )
}
