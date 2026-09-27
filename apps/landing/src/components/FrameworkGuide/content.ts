import type { FrameworkId } from '@/lib/frameworks'

// ─────────────────────────────────────────────────────────────────────────────
// Per-framework copy for the /<framework>/ quickstart + comparison sections.
//
// Everything here is code-backed or externally checked:
//  - Snippets mirror content/docs/quickstarts/<id>.mdx, which is written
//    against each package's real exports and props. Change one, change both.
//  - Competitor rows claim only three things: what the library is, whether it
//    imports from cloud drives, and its license. Licenses were read from each
//    package's npm metadata / LICENSE file on 2026-09-26 (PrimeVue 5 and
//    PrimeNG 22 moved to the paid PrimeUI license with a free community tier;
//    DevExtreme, Kendo UI and Syncfusion are commercial). Uppy's and FilePond's
//    rows match the docs comparison pages under /docs/comparisons/.
//  - Every docs link must resolve to a real page; framework-pages.test.ts
//    checks each one against the docs source.
// Superlatives and adoption claims are banned by claim-integrity.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface Competitor {
    name: string
    /** One neutral line on what it is. */
    what: string
    /** Cloud-drive import (Google Drive, OneDrive, Dropbox, Box) built in. */
    cloudDrives: string
    license: string
}

export interface GuideLink {
    href: string
    label: string
}

export interface FrameworkGuideContent {
    /** Step 3 — enabling sources and cloud drives. */
    drivesFile: string
    drivesCode: string
    /** Short framework/SSR notes — one or two sentences each. */
    notes: { title: string; body: string }[]
    competitors: Competitor[]
    /** Linked under the table: the docs roundup, or the hub when none. */
    comparisonLink: GuideLink
    links: GuideLink[]
}

const NO = 'No'
const UPPY: Competitor = {
    name: 'Uppy',
    what: 'Modular uploader with framework wrappers around its UI plugins',
    cloudDrives: 'Yes, through its Companion server',
    license: 'MIT',
}
const FILEPOND: Competitor = {
    name: 'FilePond',
    what: 'Upload widget that posts to your own server endpoint',
    cloudDrives: NO,
    license: 'MIT',
}

const JSX_DRIVES = `<UpupUploader
  provider="aws"
  uploadEndpoint="/api/upload-token"
  sources={['local', 'camera', 'googleDrive', 'oneDrive']}
  cloudDrives={{
    googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
    oneDrive: { clientId: '...' },
  }}
/>`

const VUE_DRIVES = `<template>
  <UpupUploader
    provider="aws"
    upload-endpoint="/api/upload-token"
    :sources="['local', 'camera', 'googleDrive', 'oneDrive']"
    :cloud-drives="{
      googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
      oneDrive: { clientId: '...' },
    }"
  />
</template>`

const ANGULAR_DRIVES = `@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UpupUploaderComponent],
  template: \`<upup-uploader [config]="config" />\`,
})
export class AppComponent {
  config = {
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
    sources: ['local', 'camera', 'googleDrive', 'oneDrive'],
    cloudDrives: {
      googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
      oneDrive: { clientId: '...' },
    },
  }
}`

const VANILLA_DRIVES = `createUploader('#uploader', {
  provider: 'aws',
  uploadEndpoint: '/api/upload-token',
  sources: ['local', 'camera', 'googleDrive', 'oneDrive'],
  cloudDrives: {
    googleDrive: { clientId: '...', apiKey: '...', appId: '...' },
    oneDrive: { clientId: '...' },
  },
})`

/** Links every framework page carries after its own quickstart. */
const SHARED_LINKS: GuideLink[] = [
    {
        href: '/docs/guides/server-mode-setup/',
        label: 'Server mode setup with @useupup/server',
    },
    { href: '/docs/guides/storage/aws-s3/', label: 'Upload to AWS S3' },
    {
        href: '/docs/guides/storage/cloudflare-r2/',
        label: 'Upload to Cloudflare R2',
    },
    { href: '/docs/guides/storage/minio/', label: 'Upload to MinIO' },
    {
        href: '/docs/guides/storage/azure-blob/',
        label: 'Upload to Azure Blob Storage',
    },
    { href: '/docs/resumable-uploads/', label: 'Resumable uploads' },
    { href: '/docs/localization/', label: 'Localization and i18n' },
    {
        href: '/docs/api-reference/events/',
        label: 'Events and callbacks reference',
    },
    { href: '/docs/comparisons/upup-vs-uppy/', label: 'upup vs Uppy' },
    { href: '/docs/comparisons/upup-vs-filepond/', label: 'upup vs FilePond' },
]

const PROPS_REFERENCE: GuideLink = {
    href: '/docs/api-reference/upupuploader/required-props/',
    label: 'UpupUploader props reference',
}

function quickstart(id: string, name: string): GuideLink {
    return { href: `/docs/quickstarts/${id}/`, label: `${name} quickstart` }
}

function roundup(id: string, name: string): GuideLink {
    return {
        href: `/docs/comparisons/best-${id}-file-upload-libraries/`,
        label: `${name} file upload libraries compared`,
    }
}

const COMPARISONS_HUB: GuideLink = {
    href: '/docs/comparisons/',
    label: 'all upup comparisons',
}

export const FRAMEWORK_GUIDES: Record<FrameworkId, FrameworkGuideContent> = {
    react: {
        drivesFile: 'Uploader.tsx',
        drivesCode: JSX_DRIVES,
        notes: [
            {
                title: 'Next.js',
                body: "In the App Router the uploader is a Client Component, so keep the 'use client' directive from the snippet. @useupup/next re-exports this UI and adds server-mode route handlers for the App Router and the Pages Router.",
            },
            {
                title: 'Image editor',
                body: 'Cropping, rotating and annotating images before upload is built in and on by default in the React package. Pass imageEditor={false} to turn it off.',
            },
        ],
        competitors: [
            {
                name: 'react-dropzone',
                what: 'Drop-zone hook; you build the UI and the upload',
                cloudDrives: NO,
                license: 'MIT',
            },
            {
                name: 'react-uploady',
                what: 'Upload hooks and components, with chunked and tus add-ons',
                cloudDrives: NO,
                license: 'MIT',
            },
            FILEPOND,
            UPPY,
        ],
        comparisonLink: roundup('react', 'React'),
        links: [
            quickstart('react', 'React'),
            quickstart('next', 'Next.js'),
            PROPS_REFERENCE,
            ...SHARED_LINKS,
            {
                href: '/docs/comparisons/upup-vs-react-dropzone/',
                label: 'upup vs react-dropzone',
            },
            {
                href: '/docs/comparisons/upup-vs-uploadthing/',
                label: 'upup vs UploadThing',
            },
        ],
    },
    vue: {
        drivesFile: 'Uploader.vue',
        drivesCode: VUE_DRIVES,
        notes: [
            {
                title: 'Nuxt',
                body: '@useupup/vue is a standard Vue 3.4+ component. File picking and uploading run in the browser, so in Nuxt render it inside <ClientOnly>.',
            },
            {
                title: 'Composition API',
                body: 'The useUpupUpload, useUploaderFiles and useUploaderContext composables expose the same engine when you want your own markup.',
            },
        ],
        competitors: [
            {
                name: 'PrimeVue FileUpload',
                what: 'Upload component in the PrimeVue UI suite',
                cloudDrives: NO,
                license: 'PrimeUI license: paid, with a free community tier',
            },
            {
                name: 'DevExtreme FileUploader',
                what: 'Upload component in the DevExtreme UI suite',
                cloudDrives: NO,
                license: 'Commercial',
            },
            {
                name: 'vue-upload-component',
                what: 'Multi-file and drag-and-drop upload component',
                cloudDrives: NO,
                license: 'Apache-2.0',
            },
        ],
        comparisonLink: roundup('vue', 'Vue'),
        links: [quickstart('vue', 'Vue'), PROPS_REFERENCE, ...SHARED_LINKS],
    },
    svelte: {
        drivesFile: 'Uploader.svelte',
        drivesCode: JSX_DRIVES,
        notes: [
            {
                title: 'SvelteKit',
                body: "@useupup/svelte is a Svelte 5 component. Uploading runs in the browser, so in SvelteKit render it on the client, for example inside {#if browser} with browser from '$app/environment'.",
            },
            {
                title: 'Stores',
                body: 'toReadable adapts an uploader store to a Svelte readable when you build your own UI on the same engine.',
            },
        ],
        competitors: [
            {
                name: 'svelte-file-dropzone',
                what: 'Dropzone component; you handle the upload',
                cloudDrives: NO,
                license: 'MIT',
            },
            { ...FILEPOND, what: 'Upload widget with a Svelte adapter' },
            UPPY,
        ],
        comparisonLink: COMPARISONS_HUB,
        links: [
            quickstart('svelte', 'Svelte'),
            PROPS_REFERENCE,
            ...SHARED_LINKS,
        ],
    },
    angular: {
        drivesFile: 'app.component.ts',
        drivesCode: ANGULAR_DRIVES,
        notes: [
            {
                title: 'Standalone or NgModule',
                body: "UpupUploaderComponent is standalone (Angular 19–22). Add it to a standalone component's imports or an NgModule's imports, and pass everything through its single config input.",
            },
            {
                title: 'Styles',
                body: "Load the stylesheet once: add '@useupup/angular/styles' to the styles array in angular.json, or @import it from your global styles.css.",
            },
        ],
        competitors: [
            {
                name: 'PrimeNG FileUpload',
                what: 'Upload component in the PrimeNG UI suite',
                cloudDrives: NO,
                license: 'PrimeUI license: paid, with a free community tier',
            },
            {
                name: 'Kendo UI Upload',
                what: 'Upload component in Kendo UI for Angular',
                cloudDrives: NO,
                license: 'Commercial',
            },
            {
                name: 'Syncfusion Uploader',
                what: 'Uploader in the Syncfusion Essential JS 2 suite',
                cloudDrives: NO,
                license: 'Commercial, with a free community license',
            },
            {
                name: 'ngx-file-drop',
                what: 'File and folder drop zone; you handle the upload',
                cloudDrives: NO,
                license: 'MIT',
            },
        ],
        comparisonLink: roundup('angular', 'Angular'),
        links: [
            quickstart('angular', 'Angular'),
            PROPS_REFERENCE,
            ...SHARED_LINKS,
        ],
    },
    vanilla: {
        drivesFile: 'uploader.ts',
        drivesCode: VANILLA_DRIVES,
        notes: [
            {
                title: 'No framework required',
                body: 'createUploader takes a CSS selector or an HTMLElement. Call destroy() on the returned instance when you tear the view down.',
            },
            {
                title: 'Web component',
                body: "Import '@useupup/vanilla/element' to register an <upup-uploader> custom element and configure it with provider and upload-endpoint attributes.",
            },
        ],
        competitors: [
            {
                name: 'Dropzone.js',
                what: 'Drag-and-drop upload library for plain JavaScript',
                cloudDrives: NO,
                license: 'MIT',
            },
            FILEPOND,
            UPPY,
        ],
        comparisonLink: COMPARISONS_HUB,
        links: [quickstart('vanilla', 'Vanilla JS'), ...SHARED_LINKS],
    },
    preact: {
        drivesFile: 'App.tsx',
        drivesCode: JSX_DRIVES,
        notes: [
            {
                title: 'preact/compat',
                body: '@useupup/preact is a preact/compat re-export of @useupup/react, so it needs Preact 10.13+ and the standard react and react-dom to preact/compat aliases in your bundler.',
            },
            {
                title: 'Image editor',
                body: 'The editor loads as a lazy, isolated real-React island, so React never enters your main Preact bundle.',
            },
        ],
        competitors: [FILEPOND, UPPY],
        comparisonLink: COMPARISONS_HUB,
        links: [
            quickstart('preact', 'Preact'),
            quickstart('react', 'React'),
            PROPS_REFERENCE,
            ...SHARED_LINKS,
        ],
    },
}
