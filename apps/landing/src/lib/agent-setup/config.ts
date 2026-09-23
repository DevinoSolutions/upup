// ONE manifest for the agent-onboarding surface. prompt.md (the file a coding
// agent fetches and executes), the /agent-setup/ human pages, the pill's
// copied sentence, and the llms.txt/sitemap entries are all rendered from
// here so they cannot drift from each other. upup is an npm library with no
// MCP server, CLI, or API key — "setting up an agent for upup" means giving
// the agent an accurate model of the packages (the context block below) and
// installing + wiring the right @useupup/* package into the user's project.

import { siteUrl } from '@/lib/site-url'

export const APP_NAME = 'upup'

/** Route paths, relative to the site origin (trailingSlash:true site). */
export const AGENT_SETUP_PATH = '/agent-setup/'
export const AGENT_SETUP_PROMPT_PATH = '/agent-setup/prompt.md'
export const DOCS_FAQ_PATH = '/docs/faq/'

export function agentSetupPromptUrl(): string {
    return `${siteUrl()}${AGENT_SETUP_PROMPT_PATH}`
}

/** The exact sentence the pill copies. Mirrors Cloudflare's mechanism. */
export function agentSetupSentence(): string {
    return `Fetch and execute the appropriate instructions to set me up for ${APP_NAME} from ${agentSetupPromptUrl()}`
}

export const AGENT_SETUP_TOAST = 'Copied. Paste into any AI coding agent.'

export type AgentId = 'claude-code' | 'codex' | 'cursor' | 'opencode'

export interface AgentMeta {
    id: AgentId
    name: string
    /** Path (relative to the project root) the context block is written to. */
    contextPath: string
    /** Anything that has to precede the context block in that file. */
    contextHeader?: string
    /** Light / dark icon variants under /img/agents/. */
    icon: { light: string; dark: string }
}

export const AGENTS: readonly AgentMeta[] = [
    {
        id: 'claude-code',
        name: 'Claude Code',
        contextPath: 'CLAUDE.md',
        icon: {
            light: '/img/agents/claude-code.svg',
            dark: '/img/agents/claude-code-dark.svg',
        },
    },
    {
        id: 'codex',
        name: 'Codex',
        contextPath: 'AGENTS.md',
        icon: {
            light: '/img/agents/codex.svg',
            dark: '/img/agents/codex-dark.svg',
        },
    },
    {
        id: 'cursor',
        name: 'Cursor',
        contextPath: '.cursor/rules/upup.mdc',
        contextHeader: [
            '---',
            'description: upup file uploader — packages, modes, and wiring',
            'alwaysApply: false',
            'globs: ["**/*.tsx", "**/*.ts", "**/*.vue", "**/*.svelte"]',
            '---',
            '',
        ].join('\n'),
        icon: {
            light: '/img/agents/cursor.svg',
            dark: '/img/agents/cursor-dark.svg',
        },
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        contextPath: 'AGENTS.md',
        icon: {
            light: '/img/agents/opencode.svg',
            dark: '/img/agents/opencode-dark.svg',
        },
    },
]

export const AGENT_IDS: readonly AgentId[] = AGENTS.map(agent => agent.id)

export function getAgent(id: string): AgentMeta | undefined {
    return AGENTS.find(agent => agent.id === id)
}

/** One published UI package per framework, with what wiring it needs. */
export interface FrameworkPackage {
    id: string
    name: string
    pkg: string
    /** How a project is recognised as using this framework. */
    detect: string
    quickstart: string
    /** Minimal client-mode mount snippet, verified against the quickstart. */
    snippet: string
}

const PRESIGN_ROUTE = '/api/upload-token'

export const FRAMEWORK_PACKAGES: readonly FrameworkPackage[] = [
    {
        id: 'next',
        name: 'Next.js',
        pkg: '@useupup/next',
        detect: '`next` in package.json dependencies',
        quickstart: '/docs/quickstarts/next/',
        snippet: [
            "'use client'",
            '',
            "import { UpupUploader } from '@useupup/next'",
            "import '@useupup/next/styles'",
            '',
            'export default function Uploader() {',
            `    return <UpupUploader provider="aws" uploadEndpoint="${PRESIGN_ROUTE}" />`,
            '}',
        ].join('\n'),
    },
    {
        id: 'react',
        name: 'React',
        pkg: '@useupup/react',
        detect: '`react` (19+) in package.json dependencies and no `next`',
        quickstart: '/docs/quickstarts/react/',
        snippet: [
            "import { UpupUploader } from '@useupup/react'",
            "import '@useupup/react/styles'",
            '',
            'export default function Uploader() {',
            `    return <UpupUploader provider="aws" uploadEndpoint="${PRESIGN_ROUTE}" />`,
            '}',
        ].join('\n'),
    },
    {
        id: 'vue',
        name: 'Vue',
        pkg: '@useupup/vue',
        detect: '`vue` (3+) in package.json dependencies',
        quickstart: '/docs/quickstarts/vue/',
        snippet: [
            '<script setup lang="ts">',
            "import { UpupUploader } from '@useupup/vue'",
            "import '@useupup/vue/styles'",
            '</script>',
            '',
            '<template>',
            `    <UpupUploader provider="aws" upload-endpoint="${PRESIGN_ROUTE}" />`,
            '</template>',
        ].join('\n'),
    },
    {
        id: 'svelte',
        name: 'Svelte',
        pkg: '@useupup/svelte',
        detect: '`svelte` (5+) in package.json dependencies',
        quickstart: '/docs/quickstarts/svelte/',
        snippet: [
            '<script lang="ts">',
            "    import { UpupUploader } from '@useupup/svelte'",
            "    import '@useupup/svelte/styles'",
            '</script>',
            '',
            `<UpupUploader provider="aws" uploadEndpoint="${PRESIGN_ROUTE}" />`,
        ].join('\n'),
    },
    {
        id: 'angular',
        name: 'Angular',
        pkg: '@useupup/angular',
        detect: '`@angular/core` (17+) in package.json dependencies',
        quickstart: '/docs/quickstarts/angular/',
        snippet: [
            "import { Component } from '@angular/core'",
            "import { UpupUploaderComponent } from '@useupup/angular'",
            '',
            '@Component({',
            "    selector: 'app-uploader',",
            '    standalone: true,',
            '    imports: [UpupUploaderComponent],',
            '    template: `<upup-uploader',
            `        [config]="{ provider: 'aws', uploadEndpoint: '${PRESIGN_ROUTE}' }"`,
            '    />`,',
            '})',
            'export class UploaderComponent {}',
            '',
            "// Load the stylesheet once globally: add '@useupup/angular/styles' to the",
            "// `styles` array in angular.json, or `@import '@useupup/angular/styles';`",
            '// in the global styles.css.',
        ].join('\n'),
    },
    {
        id: 'preact',
        name: 'Preact',
        pkg: '@useupup/preact',
        detect: '`preact` in package.json dependencies',
        quickstart: '/docs/quickstarts/preact/',
        snippet: [
            "import { UpupUploader } from '@useupup/preact'",
            "import '@useupup/preact/styles'",
            '',
            'export function Uploader() {',
            `    return <UpupUploader provider="aws" uploadEndpoint="${PRESIGN_ROUTE}" />`,
            '}',
        ].join('\n'),
    },
    {
        id: 'vanilla',
        name: 'Vanilla JS',
        pkg: '@useupup/vanilla',
        detect: 'no framework dependency at all',
        quickstart: '/docs/quickstarts/vanilla/',
        snippet: [
            "import { createUploader } from '@useupup/vanilla'",
            "import '@useupup/vanilla/styles'",
            '',
            "const uploader = createUploader('#uploader', {",
            "    provider: 'aws',",
            `    uploadEndpoint: '${PRESIGN_ROUTE}',`,
            '})',
            '',
            '// Later, when you tear down the view:',
            'uploader.destroy()',
        ].join('\n'),
    },
]

export const SERVER_PACKAGE = '@useupup/server'

/**
 * The compact, verified model of upup an agent should carry. Same content as
 * the "Paste-ready context block" on /docs/ai-assistants/ — kept here so the
 * prompt, the per-agent pages, and that docs page cannot diverge.
 */
export function agentContextBlock(): string {
    const origin = siteUrl()
    return [
        `# upup — MIT self-hosted file uploader (docs: ${origin}/docs/)`,
        'upup is one headless core plus native UI packages for six frameworks; every package renders the same uploader.',
        'Nine published @useupup/* packages:',
        '- @useupup/core     headless engine: file state, upload pipeline (compression, HEIC, web-worker), cloud-drive plugins, i18n, theme. Zero framework deps.',
        '- @useupup/react    canonical UI (React 19). @useupup/vue, @useupup/svelte, @useupup/angular, @useupup/vanilla, @useupup/preact are native ports with the same DOM.',
        '- @useupup/next     Next.js client re-export + /server route handlers (App and Pages routers).',
        '- @useupup/server   server-mode endpoints: S3-compatible presign + proxy, cloud-drive token exchange, HMAC-signed upload-token trust model.',
        'Client mode (default): the browser uploads straight to your storage; your app returns presigned URLs at `uploadEndpoint`. No server package required.',
        "  React example: import { UpupUploader } from '@useupup/react'; import '@useupup/react/styles'",
        `                 <UpupUploader provider="aws" uploadEndpoint="${PRESIGN_ROUTE}" />`,
        'Server mode: point the uploader at @useupup/server with mode="server" serverUrl="/api/upup".',
        "  createUpupHandler({ storage: { type: 'aws', bucket, region }, uploadTokenSecret })",
        '  — uploadTokenSecret is REQUIRED and must be >= 16 chars, or it throws at construction.',
        'Sources: local drag-and-drop, URL/link import, camera, screen capture, and cloud drives (Google Drive, OneDrive, Dropbox, Box).',
        'Optional: image compression, HEIC conversion, resumable uploads (tus or S3 multipart), ICU i18n, theming. Image editor is React/Preact only.',
        `Quickstarts: ${origin}/docs/quickstarts/<react|vue|svelte|angular|vanilla|preact|next>/`,
        `Machine-readable docs: ${origin}/llms.txt (index) and ${origin}/llms-full.txt (full corpus). FAQ: ${origin}${DOCS_FAQ_PATH}`,
    ].join('\n')
}

/** Links every rendering (prompt.md, pages, llms.txt) points at. */
export function agentSetupResources(): { label: string; href: string }[] {
    const origin = siteUrl()
    return [
        { label: 'Docs home', href: `${origin}/docs/` },
        { label: 'FAQ', href: `${origin}${DOCS_FAQ_PATH}` },
        { label: 'llms.txt', href: `${origin}/llms.txt` },
        { label: 'llms-full.txt', href: `${origin}/llms-full.txt` },
        {
            label: 'Server mode setup',
            href: `${origin}/docs/guides/server-mode-setup/`,
        },
        {
            label: 'API reference',
            href: `${origin}/docs/api-reference/upupuploader/required-props/`,
        },
        { label: 'Code examples', href: `${origin}/docs/code-examples/` },
        { label: 'Support', href: `${origin}/support/` },
        { label: 'GitHub', href: 'https://github.com/DevinoSolutions/upup' },
    ]
}
