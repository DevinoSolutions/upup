// Server component: emits JSON-LD structured data for SEO (rendered server-side).
// Facts here are code-backed — see the six @useupup/* framework packages, @useupup/core
// (headless engine), @useupup/server (HMAC-signed server mode), and the cloud-drive
// plugins (Google Drive, OneDrive, Dropbox, Box).

import { faqsFor } from '@/lib/faqs'
import type { FrameworkId } from '@/lib/frameworks'
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

// Built from the SAME list FAQSection renders for the page (faqsFor), so the
// FAQPage a page emits always matches its visible questions — Google treats a
// FAQPage whose questions are not on the page as spammy markup.
function faqPage(framework?: FrameworkId) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqsFor(framework).map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    }
}

// Framework pages sit one level under the home page. The crumb name matches
// the page's H1 ("<Framework> File Uploader").
function breadcrumbList(framework: { id: FrameworkId; name: string }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: canonicalUrl(),
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: `${framework.name} File Uploader`,
                item: canonicalUrl(framework.id),
            },
        ],
    }
}

// Framework FAQ answers quote markup (`<UpupUploader … />`), so `<` is escaped
// to its JSON unicode form: the payload stays identical JSON, but no string in
// it can ever close the surrounding <script> element.
function JsonLd({ data }: Readonly<{ data: object }>) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, '\\u003c'),
            }}
        />
    )
}

export default function StructuredData({
    framework,
}: Readonly<{
    framework?: { id: FrameworkId; name: string; pkg: string }
}> = {}) {
    const app = framework
        ? {
              ...softwareApplication,
              url: canonicalUrl(framework.id),
              description: `Open-source ${framework.name} file uploader (${framework.pkg}) with a headless core. The same uploader ships native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact, with cloud-drive sources, camera, screen capture, and secure server-mode uploads to any S3-compatible storage.`,
          }
        : softwareApplication
    return (
        <>
            <JsonLd data={app} />
            <JsonLd data={faqPage(framework?.id)} />
            {framework && <JsonLd data={breadcrumbList(framework)} />}
        </>
    )
}
