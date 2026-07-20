// Server component: emits JSON-LD structured data for SEO (rendered server-side).
// Facts here are code-backed — see the six @upupjs/* framework packages, @upupjs/core
// (headless engine), @upupjs/server (HMAC-signed server mode), and the cloud-drive
// plugins (Google Drive, OneDrive, Dropbox, Box).

import { faqs } from '@/lib/faqs'

const SITE_URL = 'https://useupup.com'
const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'upup',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
        'Open-source file uploader with a headless core and native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact. Includes cloud-drive sources, camera, screen capture, and secure server-mode uploads to any S3-compatible storage.',
    url: SITE_URL,
    license: 'https://opensource.org/licenses/MIT',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
    },
    sameAs: [GITHUB_URL],
}

const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
        },
    })),
}

export default function StructuredData({
    framework,
}: Readonly<{ framework?: { id: string; name: string; pkg: string } }> = {}) {
    const app = framework
        ? {
              ...softwareApplication,
              url: `${SITE_URL}/${framework.id}`,
              description: `Open-source ${framework.name} file uploader (${framework.pkg}) with a headless core. The same uploader ships native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact, with cloud-drive sources, camera, screen capture, and secure server-mode uploads to any S3-compatible storage.`,
          }
        : softwareApplication
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
            />
        </>
    )
}
