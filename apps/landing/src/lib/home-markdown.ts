// The home page as Markdown: the body served at /index.md, and at / to a
// request that asks for `text/markdown` (fleet agent-surface contract,
// GetItDone T-5785). An agent reads the page's text in one fetch instead of
// parsing the HTML, the hydration payload and the live-demo scripts.
//
// Built from the same modules the home sections render (the page title and
// description, the framework registry behind the hero's framework strip and
// install box, the storage-provider and file-type lists of the features
// section, the home FAQ, the agent-setup pill's sentence), so the twin can only
// say what the page says. No env reads beyond siteUrl(), no I/O: safe inside
// `next build` and under Vitest.
//
// How a request reaches it, and why the Markdown answer is never cached for a
// browser: next.config.mjs (the `/` rewrite and its Link header) and
// src/app/index.md/route.ts.
import { fileTypes } from '@/components/HomepageFeatures/fileTypes'
import {
    developerStorageProviders,
    userStorageProviders,
} from '@/components/HomepageFeatures/providers'
import type { Integration } from '@/components/HomepageFeatures/types'
import { agentSetupSentence, AGENT_SETUP_PATH } from '@/lib/agent-setup/config'
import { DISCORD_INVITE_URL } from '@/lib/community-links'
import { faqs } from '@/lib/faqs'
import { FRAMEWORK_LIST, FRAMEWORKS } from '@/lib/frameworks'
import { HOME_DESCRIPTION, HOME_TITLE } from '@/lib/home-page'
import { canonicalUrl, siteUrl } from '@/lib/site-url'

/** The hero's "View Source" button. */
export const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

/**
 * Headers for the Markdown answer. `/` now has two bodies, so the Markdown one
 * names `Accept` as a cache key and is never stored by a shared cache.
 */
export const MARKDOWN_TWIN_HEADERS = {
    'content-type': 'text/markdown; charset=utf-8',
    vary: 'Accept',
    'cache-control': 'private, no-store',
} as const

/** A provider line as its chip reads: the name, its docs page when it has one, and its caveat. */
function providerLine(provider: Integration): string {
    const name = provider.href
        ? `[${provider.name}](${siteUrl()}${provider.href})`
        : provider.name
    const caveat = provider.qualifier ? ` (${provider.qualifier})` : ''
    return `- ${name}${caveat}`
}

/** The features section's split: the wall shows everything not planned, the strip the rest. */
function providerSection(providers: Integration[]): string[] {
    const supported = providers.filter(p => p.status !== 'planned')
    const planned = providers.filter(p => p.status === 'planned')
    return [
        ...supported.map(providerLine),
        ...(planned.length
            ? ['', `On the roadmap: ${planned.map(p => p.name).join(', ')}.`]
            : []),
    ]
}

export function renderHomeMarkdown(): string {
    const site = siteUrl()
    const react = FRAMEWORKS.react
    const lines = [
        `# ${HOME_TITLE}`,
        '',
        `> ${HOME_DESCRIPTION}`,
        '',
        `Canonical page: ${canonicalUrl()}`,
        '',
        '## Install',
        '',
        '```sh',
        `npm install ${react.pkg}`,
        '```',
        '',
        `Also \`pnpm add ${react.pkg}\`, \`yarn add ${react.pkg}\` or \`bun add ${react.pkg}\`. Each framework has its own package, listed below.`,
        '',
        `Setting upup up with an AI coding agent: paste this sentence into the agent. "${agentSetupSentence()}" (how it works: ${canonicalUrl(AGENT_SETUP_PATH)})`,
        '',
        '## Frameworks',
        '',
        'One core, six frameworks: a native UI package for each.',
        '',
        ...FRAMEWORK_LIST.map(
            fw =>
                `- [${fw.name}](${canonicalUrl(fw.id)}): \`${fw.pkg}\`, quickstart ${canonicalUrl(`docs/quickstarts/${fw.id}`)}`,
        ),
        '',
        '## Cloud sources your users can upload from',
        '',
        'Users can directly upload from these providers in upup:',
        '',
        ...providerSection(userStorageProviders),
        '',
        '## Storage you can upload to',
        '',
        'You can connect to upup using any S3 provider. We also support Azure Blob Storage in client mode.',
        '',
        ...providerSection(developerStorageProviders),
        '',
        '## File types',
        '',
        ...fileTypes.map(type => `- ${type.label}: ${type.types}`),
        '',
        '## Frequently asked questions',
        '',
        ...faqs.flatMap(({ question, answer }) => [
            `**Q: ${question}**`,
            '',
            answer,
            '',
        ]),
        '## Links',
        '',
        `- Documentation: ${canonicalUrl('docs')}`,
        `- Docs index for agents: ${site}/llms.txt`,
        `- Full docs corpus: ${site}/llms-full.txt`,
        `- Source code (MIT): ${GITHUB_URL}`,
        `- Community Discord: ${DISCORD_INVITE_URL}`,
    ]
    return lines.join('\n').trimEnd()
}
