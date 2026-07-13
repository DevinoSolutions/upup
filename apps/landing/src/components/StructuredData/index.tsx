// Server component: emits JSON-LD structured data for SEO (rendered server-side).
// Facts here are code-backed — see the six @upup/* framework packages, @upup/core
// (headless engine), @upup/server (HMAC-signed server mode), and the cloud-drive
// plugins (Google Drive, OneDrive, Dropbox, Box).

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

const faqs: { question: string; answer: string }[] = [
    {
        question: 'Which frameworks does upup support?',
        answer: 'upup ships one uploader with native UI packages for React, Vue, Svelte, Angular, Vanilla JS, and Preact. Every framework renders byte-identical DOM, verified by a cross-framework parity test suite, so the uploader looks and behaves the same everywhere.',
    },
    {
        question: 'Is upup free and open source?',
        answer: 'Yes. upup is MIT-licensed and free to use in commercial and personal projects. The source lives on GitHub at github.com/DevinoSolutions/upup.',
    },
    {
        question:
            'Does upup work with S3-compatible storage like MinIO or Cloudflare R2?',
        answer: 'Yes. upup uploads to any S3-compatible storage, including AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi, and more, as well as Azure Blob Storage.',
    },
    {
        question: 'Which cloud drives can users upload from?',
        answer: 'Users can import files directly from Google Drive, OneDrive, Dropbox, and Box. upup also supports uploads from the device camera, screen capture, and link (URL) imports.',
    },
    {
        question: 'What is the difference between client mode and server mode?',
        answer: 'In client mode the browser uploads directly to your storage using short-lived credentials issued by your server. In server mode uploads are proxied through your own server using the @upup/server package, which isolates storage credentials behind an HMAC-signed trust model.',
    },
    {
        question: 'Can I use my own UI with upup?',
        answer: 'Yes. The engine lives in @upup/core, a framework-agnostic headless package. You can use the built-in native UI for your framework or build a fully custom interface on the same core using the exported hooks and controllers.',
    },
]

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

export default function StructuredData() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(softwareApplication),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
            />
        </>
    )
}
