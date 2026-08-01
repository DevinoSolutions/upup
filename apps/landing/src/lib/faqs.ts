// Single source of truth for FAQ content. Consumed by StructuredData (FAQPage
// JSON-LD) and FAQSection (visible accordion) — they must never drift apart.

export interface Faq {
    question: string
    answer: string
}

export const faqs: Faq[] = [
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
        answer: 'In client mode the browser uploads directly to your storage using short-lived credentials issued by your server. In server mode uploads are proxied through your own server using the @upupjs/server package, which isolates storage credentials behind an HMAC-signed trust model.',
    },
    {
        question: 'Can I use my own UI with upup?',
        answer: 'Yes. The engine lives in @upupjs/core, a framework-agnostic headless package. You can use the built-in native UI for your framework or build a fully custom interface on the same core using the exported hooks and controllers.',
    },
]
