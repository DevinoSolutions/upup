// docusaurus.config.ts
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'

const config: Config = {
    title: 'Upup Docs – File Uploads for React, Vue, Svelte, Angular, Vanilla JS & Preact',
    tagline:
        'Open-source file upload library with native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact. Drag & drop, file picker, progress, retry, and resumable uploads, with cloud sources (Google Drive, OneDrive, Dropbox, Box) and S3-compatible / Azure Blob storage — plus an optional secure server mode for S3-compatible storage.',
    favicon: 'img/favicon.ico',

    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://useupup.com',
    baseUrl: '/documentation/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    markdown: { mermaid: true },
    headTags: [
        {
            tagName: 'meta',
            attributes: {
                name: 'description',
                content:
                    'Upup: open-source file uploads for React, Vue, Svelte, Angular, Vanilla JS & Preact. Drag & drop, resumable uploads, cloud sources (Google Drive, OneDrive, Dropbox, Box) and S3-compatible / Azure Blob storage, with an optional secure server mode for S3-compatible storage.',
            },
        },
    ],
    presets: [
        [
            '@docusaurus/preset-classic',
            {
                docs: {
                    routeBasePath: '/', // docs-only mode: served at the /documentation/ base root (…/documentation/<slug>)
                    sidebarPath: require.resolve('./sidebars.ts'),
                    editUrl: 'https://github.com/DevinoSolutions/upup',
                },
                blog: false, // disable the blog
                // pages plugin left enabled — src/pages/index.js redirect needs it
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            },
        ],
    ],

    themes: [
        // Mermaid diagram support — pairs with `markdown.mermaid` above.
        '@docusaurus/theme-mermaid',
        // Offline/local search (no external search service, indexes at build time).
        [
            require.resolve('@easyops-cn/docusaurus-search-local'),
            {
                hashed: true,
                docsRouteBasePath: '/',
                indexBlog: false,
                indexPages: false,
                language: ['en'],
                highlightSearchTermsOnTargetPage: true,
            },
        ],
    ],

    plugins: [
        // Emits llms.txt + llms-full.txt (llmstxt.org convention) into the build
        // out-dir, so they deploy at /documentation/llms.txt for AI coding agents.
        [
            'docusaurus-plugin-llms',
            {
                generateLLMsTxt: true,
                generateLLMsFullTxt: true,
                docsDir: 'docs',
                includeBlog: false,
                // Link to the HTML doc pages (…/documentation/<slug>) rather than
                // appending .md — no per-page markdown files are generated.
                addMdExtension: false,
                title: 'upup — File uploads for every framework',
                description:
                    'Open-source file upload library with native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact, with cloud sources, resumable uploads, and an optional secure server mode.',
            },
        ],
    ],

    themeConfig: {
        image: 'img/social-card.png',
        colorMode: {
            respectPrefersColorScheme: true,
            defaultMode: 'dark',
        },
        prism: {
            theme: prismThemes.oneLight,
            darkTheme: prismThemes.oneDark,
        },
        navbar: {
            logo: {
                alt: 'Upup',
                src: 'img/logo.png',
                srcDark: 'img/logo-dark.png',
            },
            items: [
                {
                    to:
                        process.env.NEXT_PUBLIC_BASE_URL ||
                        'https://useupup.com',
                    label: 'Back to the main page',
                    position: 'left',
                    target: '_self',
                },
                {
                    href: 'https://github.com/DevinoSolutions/upup',
                    label: 'GitHub',
                    position: 'right',
                },
                {
                    href: 'https://www.npmjs.com/package/@upup/react',
                    label: 'npm',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        { label: 'Getting Started', to: '/getting-started' },
                    ],
                },
                {
                    title: 'Community',
                    items: [
                        {
                            label: 'GitHub',
                            href: 'https://github.com/DevinoSolutions/upup',
                        },
                        {
                            label: 'npm',
                            href: 'https://www.npmjs.com/package/@upup/react',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        { label: 'useupup.com', href: 'https://useupup.com' },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Devino Solutions. MIT Licensed.`,
        },
    },
}

export default config
