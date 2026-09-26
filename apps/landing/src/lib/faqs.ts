import type { FrameworkId } from '@/lib/frameworks'

// Single source of truth for FAQ content. Consumed by StructuredData (FAQPage
// JSON-LD) and FAQSection (visible accordion) — they must never drift apart.
//
// The home page renders `faqs`; each /<framework>/ page renders its OWN set
// from `frameworkFaqs`, so no two pages emit the same FAQPage. Every answer is
// code-backed: the props, callbacks and exports named here are the ones the
// framework's quickstart (content/docs/quickstarts/<id>.mdx) and package
// source document — do not name an API here that the package does not ship.

export interface Faq {
    question: string
    answer: string
}

export const faqs: Faq[] = [
    {
        question: 'Which frameworks does upup support?',
        answer: 'upup ships one uploader with native UI packages for React, Vue, Svelte, Angular, Vanilla JS, and Preact. Every framework renders the same DOM structure, classes, and accessibility tree, verified by a cross-framework parity test suite, so the uploader looks and behaves the same everywhere.',
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
        answer: 'In client mode the browser uploads directly to your storage using short-lived credentials issued by your server. In server mode uploads are proxied through your own server using the @useupup/server package, which isolates storage credentials behind an HMAC-signed trust model.',
    },
    {
        question: 'Can I use my own UI with upup?',
        answer: 'Yes. The engine lives in @useupup/core, a framework-agnostic headless package. You can use the built-in native UI for your framework or build a fully custom interface on the same core using the exported hooks and controllers.',
    },
]

const S3_TAIL =
    'The browser then uploads straight to the bucket, so file bytes never pass through your app server. The same setup works for Cloudflare R2, MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi, and other S3-compatible storage.'

const DRIVES_TAIL =
    'OneDrive, Dropbox, and Box are enabled the same way, and users browse their files inside the uploader panel.'

export const frameworkFaqs: Record<FrameworkId, Faq[]> = {
    react: [
        {
            question: 'How do I upload files to S3 from React?',
            answer: `Install @useupup/react and render <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />. Your uploadEndpoint route returns a short-lived presigned URL for each file. ${S3_TAIL}`,
        },
        {
            question: 'Does upup work with Next.js?',
            answer: "Yes. Render UpupUploader from a Client Component and keep the 'use client' directive. For server mode, @useupup/next re-exports the React UI and adds route handlers for both the App Router and the Pages Router, built on @useupup/server.",
        },
        {
            question:
                'Is there a free React file upload component with drag and drop?',
            answer: 'Yes. @useupup/react is MIT-licensed and free for commercial use, with no license key. One component gives you a drag-and-drop dropzone, a file picker, previews, progress bars, cloud-drive imports, camera and screen capture, and an image editor.',
        },
        {
            question: 'How do I show upload progress in React?',
            answer: 'The built-in UI shows progress for every file automatically. To drive your own UI or analytics, pass onFileUploadProgress, which receives the file and { loaded, total, percentage }, or onFilesUploadProgress, which receives the completed and total file counts for the batch.',
        },
        {
            question: 'Can users upload from Google Drive in React?',
            answer: `Yes. Add 'googleDrive' to the sources prop and put your Google clientId, apiKey, and appId under cloudDrives.googleDrive. ${DRIVES_TAIL}`,
        },
        {
            question:
                'Can users crop or edit images before uploading in React?',
            answer: 'Yes. @useupup/react ships an image editor for cropping, rotating, annotating, and filters, and it is on by default. Pass imageEditor={false} to turn it off, or an options object to configure it. Edited files go back through validation before they upload.',
        },
    ],
    vue: [
        {
            question: 'How do I upload files to S3 from Vue?',
            answer: `Install @useupup/vue and add <UpupUploader provider="aws" upload-endpoint="/api/upload-token" /> to a component. Your upload-endpoint route returns a short-lived presigned URL for each file. ${S3_TAIL}`,
        },
        {
            question: 'Does upup work with Nuxt?',
            answer: "@useupup/vue is a standard Vue 3 component (Vue 3.4 or later), so you can use it in Nuxt pages. File picking and uploading happen in the browser, so render it inside Nuxt's <ClientOnly> wrapper. For server mode, @useupup/server ships adapters for Next.js, Express, Fastify, and Hono.",
        },
        {
            question:
                'Is there a free Vue file upload component with drag and drop?',
            answer: 'Yes. @useupup/vue is MIT-licensed and free for commercial use, with no license key or paid tier. It is a native Vue 3 component with a drag-and-drop dropzone, a file picker, previews, progress bars, cloud-drive imports, and camera and screen capture.',
        },
        {
            question: 'How do I show upload progress in Vue?',
            answer: 'The built-in UI shows progress for every file automatically. For your own UI, pass the onFileUploadProgress callback prop, which receives the file and { loaded, total, percentage }, or onFilesUploadProgress for the completed and total file counts of the batch.',
        },
        {
            question: 'Can users upload from Google Drive in Vue?',
            answer: `Yes. Bind :sources with 'googleDrive' in the list and :cloud-drives with your Google clientId, apiKey, and appId under googleDrive. ${DRIVES_TAIL}`,
        },
        {
            question: 'Can I build my own upload UI in Vue?',
            answer: 'Yes. @useupup/vue exports composables such as useUpupUpload, useUploaderFiles, and useUploaderContext on top of the headless @useupup/core engine, so you can render your own markup and keep the same upload pipeline, retries, and storage support.',
        },
    ],
    svelte: [
        {
            question: 'How do I upload files to S3 from Svelte?',
            answer: `Install @useupup/svelte and render <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />. Your uploadEndpoint route returns a short-lived presigned URL for each file. ${S3_TAIL}`,
        },
        {
            question: 'Does upup work with SvelteKit?',
            answer: "@useupup/svelte is a Svelte 5 component, so you can use it in SvelteKit routes. File picking and uploading happen in the browser, so render it on the client, for example inside {#if browser} with browser imported from '$app/environment'. For server mode, @useupup/server ships adapters for Next.js, Express, Fastify, and Hono.",
        },
        {
            question:
                'Is there a free Svelte file upload component with drag and drop?',
            answer: 'Yes. @useupup/svelte is MIT-licensed and free for commercial use. It is a native Svelte 5 component, not a wrapper around another UI, with a drag-and-drop dropzone, a file picker, previews, progress bars, cloud-drive imports, and camera and screen capture.',
        },
        {
            question: 'How do I show upload progress in Svelte?',
            answer: 'The built-in UI shows progress for every file automatically. For your own UI, pass the onFileUploadProgress prop, which receives the file and { loaded, total, percentage }, or onFilesUploadProgress for the completed and total file counts of the batch.',
        },
        {
            question: 'Can users upload from Google Drive in Svelte?',
            answer: `Yes. Pass sources with 'googleDrive' in the list and cloudDrives with your Google clientId, apiKey, and appId under googleDrive. ${DRIVES_TAIL}`,
        },
        {
            question: 'Can I build my own upload UI in Svelte?',
            answer: 'Yes. @useupup/svelte exports toReadable, which adapts an uploader store to a Svelte readable, plus use* helpers on top of the headless @useupup/core engine, so you can render your own markup and keep the same upload pipeline.',
        },
    ],
    angular: [
        {
            question: 'How do I upload files to S3 from Angular?',
            answer: `Install @useupup/angular, import the standalone UpupUploaderComponent, and render <upup-uploader [config]="{ provider: 'aws', uploadEndpoint: '/api/upload-token' }" />. Your uploadEndpoint route returns a short-lived presigned URL for each file. ${S3_TAIL}`,
        },
        {
            question:
                'Does the Angular uploader work with standalone components and NgModules?',
            answer: "Yes. UpupUploaderComponent is a standalone component (selector upup-uploader) for Angular 19 and later. Add it to a standalone component's imports or to an NgModule's imports. Everything is passed through one config input, and the stylesheet loads once from angular.json.",
        },
        {
            question:
                'Is there a free Angular file upload component with drag and drop?',
            answer: 'Yes. @useupup/angular is MIT-licensed and free for commercial use, with no license key or paid tier. It is a native Angular component with a drag-and-drop dropzone, a file picker, previews, progress bars, cloud-drive imports, and camera and screen capture.',
        },
        {
            question: 'How do I show upload progress in Angular?',
            answer: 'The built-in UI shows progress for every file automatically. For your own UI, listen to the (uploadProgress) output, which emits { fileId, loaded, total } for each file. (filesAdded), (fileRemoved), (uploadAllComplete), and (error) outputs cover the rest of the lifecycle.',
        },
        {
            question: 'Can users upload from Google Drive in Angular?',
            answer: `Yes. Add 'googleDrive' to config.sources and your Google clientId, apiKey, and appId under config.cloudDrives.googleDrive. ${DRIVES_TAIL}`,
        },
        {
            question: 'Can I drive the uploader from my own Angular state?',
            answer: 'Yes. @useupup/angular exports UpupStore and the createUpupUpload and toSignalStore helpers, so you can read files and progress as signals and build a custom UI on the same headless @useupup/core engine.',
        },
    ],
    vanilla: [
        {
            question: 'How do I upload files to S3 with plain JavaScript?',
            answer: `Install @useupup/vanilla and call createUploader('#uploader', { provider: 'aws', uploadEndpoint: '/api/upload-token' }). Your uploadEndpoint route returns a short-lived presigned URL for each file. ${S3_TAIL}`,
        },
        {
            question:
                'Can I use the uploader without a framework or as a web component?',
            answer: 'Yes. @useupup/vanilla has no framework dependency. Mount it with createUploader, which takes a CSS selector or an HTMLElement, or import @useupup/vanilla/element to register an <upup-uploader> custom element and configure it with provider and upload-endpoint attributes.',
        },
        {
            question:
                'Is there a free JavaScript file upload library with drag and drop?',
            answer: 'Yes. @useupup/vanilla is MIT-licensed and free for commercial use. It renders a complete uploader with a drag-and-drop dropzone, a file picker, previews, progress bars, cloud-drive imports, and camera and screen capture into any page.',
        },
        {
            question: 'How do I show upload progress in plain JavaScript?',
            answer: 'The built-in UI shows progress for every file automatically. For your own UI, pass an onUploadProgress option, which receives { fileId, loaded, total }, or call subscribe() on the instance to react to every state change.',
        },
        {
            question:
                'Can users upload from Google Drive with plain JavaScript?',
            answer: `Yes. Pass sources with 'googleDrive' in the list and cloudDrives with your Google clientId, apiKey, and appId under googleDrive. ${DRIVES_TAIL}`,
        },
        {
            question: 'How do I control or remove the JavaScript uploader?',
            answer: 'createUploader returns an instance with getState(), subscribe(), addFiles(), upload(), pause(), resume(), cancel(), and retry(). Call destroy() when you tear the view down to stop the render loop and detach its listeners.',
        },
    ],
    preact: [
        {
            question: 'How do I upload files to S3 from Preact?',
            answer: `Install @useupup/preact and render <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />. Your uploadEndpoint route returns a short-lived presigned URL for each file. ${S3_TAIL}`,
        },
        {
            question: 'How is @useupup/preact related to @useupup/react?',
            answer: '@useupup/preact is a preact/compat re-export of @useupup/react, so the UI and API are the same. It needs Preact 10.13 or later and the standard preact/compat aliases (react and react-dom resolved to preact/compat) in your bundler.',
        },
        {
            question:
                'Is there a free Preact file upload component with drag and drop?',
            answer: 'Yes. @useupup/preact is MIT-licensed and free for commercial use. It includes a drag-and-drop dropzone, a file picker, previews, progress bars, cloud-drive imports, camera and screen capture, and an image editor that loads on demand.',
        },
        {
            question: 'How do I show upload progress in Preact?',
            answer: 'The built-in UI shows progress for every file automatically. For your own UI, pass onFileUploadProgress, which receives the file and { loaded, total, percentage }, or onFilesUploadProgress for the completed and total file counts of the batch.',
        },
        {
            question: 'Can users upload from Google Drive in Preact?',
            answer: `Yes. Add 'googleDrive' to the sources prop and put your Google clientId, apiKey, and appId under cloudDrives.googleDrive. ${DRIVES_TAIL}`,
        },
        {
            question: 'Does the Preact uploader include an image editor?',
            answer: 'Yes. The editor runs as an isolated real-React island that loads lazily, so React never enters your main Preact bundle. To use it, install its peers: react, react-dom, react-filerobot-image-editor, and the konva, react-konva, and styled-components packages it needs.',
        },
    ],
}

/** The FAQ set a page renders: a framework's own set, or the home page's. */
export function faqsFor(framework?: FrameworkId): Faq[] {
    return framework ? frameworkFaqs[framework] : faqs
}
