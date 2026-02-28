// docusaurus.config.ts
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Upup Docs – React File Upload Library & Examples',
  tagline:
      'Open-source React & TypeScript file upload library for Next.js, Vite, Remix & Gatsby. Customizable drag & drop UI, file picker, progress bar, retry logic, and cloud integrations for S3, Azure Blob, Google Drive, OneDrive, DigitalOcean Spaces & Backblaze B2. Supports large files and resumable uploads.',
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
          'Upup docs: React & TypeScript file upload library with drag & drop, file picker, customizable UI, progress bar & retry. S3 & Azure helpers. Large files.',
      },
    },
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: 'docs',               // <site>/docs/*
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: 'https://github.com/DevinoSolutions/upup',
        },
        blog: false,                          // disable the blog
        // remove `pages: false` so the pages plugin is enabled
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
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
          to:process.env.NEXT_PUBLIC_BASE_URL || 'https://useupup.com',
          label: 'Back to the main page',
          position: 'left',
          target: '_self',
        },
      ],
    },
  },
};

export default config;
