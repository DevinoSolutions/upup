// Server component: emits JSON-LD structured data for SEO (rendered server-side).
// Facts here are code-backed — see the six @useupup/* framework packages, @useupup/core
// (headless engine), @useupup/server (HMAC-signed server mode), and the cloud-drive
// plugins (Google Drive, OneDrive, Dropbox, Box).

import { faqs } from '@/lib/faqs'
import { canonicalUrl } from '@/lib/site-url'
import {
    ORGANIZATION_ID,
    SOFTWARE_APPLICATION_ID,
} from './EntityStructuredData'

const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

// The site-wide Organization/WebSite nodes are emitted from the root layout
// (./EntityStructuredData) so they reach every page including the docs. This
// application node names its author/publisher by @id instead of repeating the
// organization inline — one entity, referenced, not seven copies.
const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_APPLICATION_ID,
    name: 'upup',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
        'Open-source file uploader with a headless core and native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact. Includes cloud-drive sources, camera, screen capture, and secure server-mode uploads to any S3-compatible storage.',
    url: canonicalUrl(),
    license: 'https://opensource.org/licenses/MIT',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
    },
    sameAs: [GITHUB_URL],
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
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
              url: canonicalUrl(framework.id),
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
