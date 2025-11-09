// docusaurus.config.ts
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Modern File Uploads for React',
  tagline:
      'Open-source React component library with cloud storage integrations, drag & drop, and enterprise-grade features.',
  favicon: 'img/favicon.ico',

  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://useupup.com',
  baseUrl: '/documentation/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  markdown: { mermaid: true },
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
