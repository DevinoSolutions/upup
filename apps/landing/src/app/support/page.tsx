import type { Metadata } from 'next'
import { FaDiscord } from 'react-icons/fa'
import Section from '@/components/ui/Section'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'
import { ICON_CHIP } from '@/components/ui/recipes'
import SupportForm from './SupportForm'
import { DISCORD_INVITE_URL } from '@/lib/community-links'
import { canonicalUrl } from '@/lib/site-url'

export const metadata: Metadata = {
    title: 'Support — upup',
    description:
        'Report a problem, request a feature, or ask a question about upup. Your message reaches the team directly.',
    alternates: { canonical: canonicalUrl('support') },
}

export default function SupportPage() {
    return (
        <div className="min-h-[70vh] bg-[var(--bg-base)]">
            <Section clearNav>
                <SectionHeading
                    as="h1"
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
                    {/* The community route for questions other users can
                        answer; the form above stays the way to reach the team. */}
                    <a
                        href={DISCORD_INVITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="support-community-discord"
                        className="mt-6 flex items-center gap-4 rounded-xl border border-black/5 bg-[var(--bg-base)] p-5 transition-colors hover:border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:hover:border-white/20"
                    >
                        <span
                            className={`${ICON_CHIP} h-11 w-11 shrink-0 rounded-xl`}
                        >
                            <FaDiscord aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span className="flex-1">
                            <span className="block font-semibold text-gray-900 dark:text-white">
                                Join our Discord
                            </span>
                            <span className="block text-sm text-gray-600 dark:text-gray-400">
                                Ask the community, share what you are building
                                and hear about releases first.
                            </span>
                        </span>
                    </a>
                </div>
            </Section>
        </div>
    )
}
