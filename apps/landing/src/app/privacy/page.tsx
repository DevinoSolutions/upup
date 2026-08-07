import type { Metadata } from 'next'
import Section from '@/components/ui/Section'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'
import { canonicalUrl } from '@/lib/site-url'

export const metadata: Metadata = {
    title: 'Privacy Policy — upup',
    description:
        'How upup collects, uses, and safeguards your information when you visit the site or use the uploader.',
    alternates: { canonical: canonicalUrl('privacy') },
}

export default function Privacy() {
    return (
        <div className="min-h-[70vh] bg-[var(--bg-base)]">
            <Section clearNav>
                <SectionHeading
                    as="h1"
                    badge="Last updated April 25th, 2025"
                    title={
                        <>
                            Privacy{' '}
                            <span className={GRADIENT_TEXT}>Policy</span>
                        </>
                    }
                    subtitle="How upup collects, uses, and safeguards your information when you visit the site or use the uploader."
                />
                <article className="prose prose-lg mx-auto w-full max-w-3xl dark:prose-invert">
                    <p>
                        Welcome to <strong>Upup</strong> (https://useupup.com).
                        This Privacy Policy explains how we collect, use, and
                        safeguard your information when you visit our website or
                        use our services.
                    </p>

                    <h2>1. Information We Collect</h2>
                    <p>
                        We may collect personal data such as your name and email
                        address when you sign up or contact us. Additionally, we
                        gather usage data via cookies and similar technologies.
                    </p>

                    <h2>2. How We Use Your Information</h2>
                    <p>
                        Your information is used to improve our services,
                        personalize your experience, and communicate updates. We
                        ensure that we only use data in ways that enhance your
                        user experience.
                    </p>

                    <h2>3. Sharing Your Information</h2>
                    <p>
                        We do not sell or rent your data to third parties. In
                        some cases, we may share information with trusted
                        partners who assist us in operating our site, under
                        strict confidentiality agreements.
                    </p>

                    <h2>4. Security</h2>
                    <p>
                        We implement appropriate measures to protect your
                        personal information; however, no online transmission is
                        completely secure.
                    </p>

                    <h2>5. Your Rights</h2>
                    <p>
                        Depending on your jurisdiction, you may have the right
                        to access, correct, or request the deletion of your
                        personal information. For any such requests, please
                        contact us at{' '}
                        <a
                            href="mailto:hello@devino.ca"
                            className="text-primary dark:text-primary-dark hover:underline"
                        >
                            hello@devino.ca
                        </a>
                        .
                    </p>

                    <h2>6. Changes to This Policy</h2>
                    <p>
                        This Privacy Policy may be updated from time to time. We
                        encourage you to review it periodically.
                    </p>

                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions regarding this Privacy Policy,
                        please reach out via{' '}
                        <a
                            href="mailto:hello@devino.ca"
                            className="text-primary dark:text-primary-dark hover:underline"
                        >
                            hello@devino.ca
                        </a>
                        .
                    </p>
                </article>
            </Section>
        </div>
    )
}
