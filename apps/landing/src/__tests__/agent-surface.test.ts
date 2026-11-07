import { existsSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { join } from 'node:path'
import type { NextConfig } from 'next'
import { modifyRouteRegex } from 'next/dist/lib/redirect-status'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { GET as getApiCatalog } from '@/app/.well-known/api-catalog/route'
import { GET as getSecurityTxt } from '@/app/.well-known/security.txt/route'
import { GET as getHomeMarkdown } from '@/app/index.md/route'
import { metadata as homeMetadata } from '@/app/page'
import sitemap from '@/app/sitemap'
import { fileTypes } from '@/components/HomepageFeatures/fileTypes'
import {
    developerStorageProviders,
    userStorageProviders,
} from '@/components/HomepageFeatures/providers'
import { faqs } from '@/lib/faqs'
import { FRAMEWORK_LIST } from '@/lib/frameworks'
import {
    HOME_DESCRIPTION,
    HOME_MARKDOWN_PATH,
    HOME_TITLE,
} from '@/lib/home-page'
import { renderHomeMarkdown } from '@/lib/home-markdown'
import { SECURITY_CONTACT, SECURITY_TXT_EXPIRES } from '@/lib/security-txt'

// The fleet agent-surface contract (GetItDone T-5785), the parts this app
// serves: the home page's Markdown twin at /index.md, `/` answering
// `Accept: text/markdown` with it, the HTML home page naming it (markup and
// Link header), /.well-known/api-catalog (RFC 9727) and
// /.well-known/security.txt (RFC 9116). The production probe that checks the
// same things over HTTP is ci-tooling's scripts/agent-surface/check.py.

// createMDX() writes fumadocs' .source/ tree as a side effect; the routing
// rules don't depend on it, so it becomes the identity wrapper.
vi.mock('fumadocs-mdx/next', () => ({
    createMDX: () => (config: NextConfig) => config,
}))

const SITE = 'https://useupup.com'
const BROWSER =
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'

interface Condition {
    type: string
    key?: string
    value?: string
}
interface Rule {
    source: string
    destination?: string
    has?: Condition[]
    missing?: Condition[]
    headers?: { key: string; value: string }[]
}

let config: NextConfig

beforeAll(async () => {
    config = (await import('../../next.config.mjs')).default as NextConfig
})

/** Does `rule` apply to this request, by Next's own path and has/missing matchers? */
function applies(rule: Rule, pathname: string, accept?: string): boolean {
    const match = getPathMatch(rule.source, {
        strict: true,
        removeUnnamedParams: true,
        regexModifier: regex => modifyRouteRegex(regex, ['/_next']),
    })
    if (!match(pathname)) return false
    if (!rule.has && !rule.missing) return true
    const req = {
        headers: { host: 'useupup.com', ...(accept ? { accept } : {}) },
    } as unknown as IncomingMessage
    return Boolean(
        matchHas(
            req,
            {},
            rule.has as Parameters<typeof matchHas>[2],
            rule.missing as Parameters<typeof matchHas>[3],
        ),
    )
}

async function beforeFilesRewrite(pathname: string, accept?: string) {
    const rewrites = (await config.rewrites?.()) as unknown as {
        beforeFiles: Rule[]
    }
    return (
        rewrites.beforeFiles.find(rule => applies(rule, pathname, accept))
            ?.destination ?? null
    )
}

/** The Link header the config sets; when two rules set one key Next keeps the last. */
async function configLinkHeader(pathname: string, accept?: string) {
    const rules = ((await config.headers?.()) ?? []) as Rule[]
    return rules
        .filter(rule => applies(rule, pathname, accept))
        .flatMap(rule => rule.headers ?? [])
        .filter(header => header.key.toLowerCase() === 'link')
        .map(header => header.value)
        .at(-1)
}

describe('/ asked for as Markdown is the home page twin', () => {
    it.each([
        'text/markdown',
        'text/markdown, text/html;q=0.9',
        'text/plain, text/markdown',
    ])('rewrites / with Accept: %s to /index.md', async accept => {
        expect(await beforeFilesRewrite('/', accept)).toBe(HOME_MARKDOWN_PATH)
    })

    it.each([BROWSER, 'text/html, text/markdown;q=0.1', '*/*', undefined])(
        'keeps / on HTML for Accept: %s',
        async accept => {
            expect(await beforeFilesRewrite('/', accept)).toBeNull()
        },
    )

    it('negotiates the home page only: other pages and .md paths are untouched', async () => {
        expect(await beforeFilesRewrite('/react/', 'text/markdown')).toBeNull()
        expect(
            await beforeFilesRewrite('/index.md', 'text/markdown'),
        ).toBeNull()
        expect(
            await beforeFilesRewrite('/unknown.md', 'text/markdown'),
        ).toBeNull()
    })

    it('names the twin in a Link header on the HTML answer only', async () => {
        expect(await configLinkHeader('/', BROWSER)).toBe(
            `<${HOME_MARKDOWN_PATH}>; rel="alternate"; type="text/markdown"`,
        )
        expect(await configLinkHeader('/', undefined)).toContain(
            HOME_MARKDOWN_PATH,
        )
        // The Markdown answer at the same URL names only its own canonical.
        expect(await configLinkHeader('/', 'text/markdown')).toBeUndefined()
        expect(await configLinkHeader('/react/', BROWSER)).toBeUndefined()
    })

    it('declares <link rel="alternate" type="text/markdown"> in the page metadata', () => {
        expect(homeMetadata.alternates.types).toEqual({
            'text/markdown': `${SITE}${HOME_MARKDOWN_PATH}`,
        })
        expect(homeMetadata.title).toBe(HOME_TITLE)
        expect(homeMetadata.description).toBe(HOME_DESCRIPTION)
    })
})

describe('GET /index.md', () => {
    it('answers 200 text/markdown with the home page Markdown', async () => {
        const response = getHomeMarkdown()
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe(
            'text/markdown; charset=utf-8',
        )
        expect(await response.text()).toBe(`${renderHomeMarkdown()}\n`)
    })

    it('says Vary: Accept and private, no-store, so no shared cache keeps it', () => {
        const response = getHomeMarkdown()
        expect(response.headers.get('vary')).toBe('Accept')
        expect(response.headers.get('cache-control')).toBe('private, no-store')
    })

    it('names the HTML home page as canonical', () => {
        expect(getHomeMarkdown().headers.get('link')).toBe(
            `<${SITE}/>; rel="canonical"`,
        )
    })
})

describe("the home page's Markdown twin", () => {
    const markdown = renderHomeMarkdown()

    it("opens with the page's title and description", () => {
        const [title, , description] = markdown.split('\n')
        expect(title).toBe(`# ${HOME_TITLE}`)
        expect(description).toBe(`> ${HOME_DESCRIPTION}`)
    })

    it('lists every framework with its package, page and quickstart', () => {
        for (const fw of FRAMEWORK_LIST) {
            expect(markdown).toContain(
                `- [${fw.name}](${SITE}/${fw.id}/): \`${fw.pkg}\`, quickstart ${SITE}/docs/quickstarts/${fw.id}/`,
            )
        }
        expect(markdown).toContain('npm install @useupup/react')
    })

    it('lists the storage providers and file types the features section shows, planned ones as planned', () => {
        for (const provider of [
            ...userStorageProviders,
            ...developerStorageProviders,
        ]) {
            expect(markdown, provider.name).toContain(provider.name)
        }
        const roadmap = markdown
            .split('\n')
            .filter(line => line.startsWith('On the roadmap: '))
            .join('\n')
        for (const provider of [
            ...userStorageProviders,
            ...developerStorageProviders,
        ]) {
            expect(roadmap.includes(provider.name), provider.name).toBe(
                provider.status === 'planned',
            )
        }
        for (const type of fileTypes) {
            expect(markdown).toContain(`- ${type.label}: ${type.types}`)
        }
    })

    it('answers every home FAQ question', () => {
        for (const { question, answer } of faqs) {
            expect(markdown).toContain(`**Q: ${question}**`)
            expect(markdown).toContain(answer)
        }
    })

    it('links only to pages in the sitemap and to the machine-readable files', () => {
        const pages = new Set(sitemap().map(entry => entry.url))
        const machineReadable = new Set([
            `${SITE}/llms.txt`,
            `${SITE}/llms-full.txt`,
            `${SITE}/agent-setup/prompt.md`,
        ])
        const linked = Array.from(
            markdown.matchAll(/https:\/\/useupup\.com[^\s)"]*/g),
            match => match[0].replace(/[.,]$/, ''),
        )
        expect(linked.length).toBeGreaterThan(15)
        const dead = linked.filter(
            url => !pages.has(url) && !machineReadable.has(url),
        )
        expect(dead).toEqual([])
    })
})

describe('GET /.well-known/api-catalog', () => {
    type Target = { href: string; type?: string; title?: string }
    type Context = { anchor: string } & Record<string, string | Target[]>

    async function linkset(): Promise<Context[]> {
        return ((await getApiCatalog().json()) as { linkset: Context[] })
            .linkset
    }

    it('answers 200 application/linkset+json with the RFC 9727 profile', () => {
        const response = getApiCatalog()
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe(
            'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
        )
        expect(response.headers.get('link')).toBe(
            '</.well-known/api-catalog>; rel="api-catalog"',
        )
    })

    it('lists the self-hosted @useupup/server HTTP API and claims no OpenAPI', async () => {
        const contexts = await linkset()
        const [self] = contexts
        expect(self?.anchor).toBe(`${SITE}/.well-known/api-catalog`)
        expect(self?.item).toEqual([
            expect.objectContaining({
                href: `${SITE}/docs/api-reference/server-http/`,
            }),
        ])
        expect(JSON.stringify(contexts)).not.toContain('service-desc')
        expect(JSON.stringify(contexts)).not.toContain('/api/upup')
    })

    it('points only at documents this app serves', async () => {
        const contexts = await linkset()
        const urls = new Set([
            ...contexts.map(context => context.anchor),
            ...contexts.flatMap(context =>
                Object.values(context).flatMap(value =>
                    Array.isArray(value) ? value.map(t => t.href) : [],
                ),
            ),
        ])
        const content = join(process.cwd(), 'content/docs')
        for (const url of urls) {
            expect(url.startsWith(`${SITE}/`), url).toBe(true)
            const path = url.slice(SITE.length)
            if (
                path === '/.well-known/api-catalog' ||
                path === '/llms-full.txt'
            )
                continue
            // A docs page (/docs/<slug>/) or its Markdown twin (/docs/<slug>.md).
            const slug = path.match(/^\/docs\/(.+?)(?:\/|\.md)$/)?.[1]
            expect(slug, url).toBeTruthy()
            expect(existsSync(join(content, `${slug}.mdx`)), url).toBe(true)
        }
    })
})

describe('GET /.well-known/security.txt', () => {
    const DAY = 24 * 60 * 60 * 1000

    it('answers 200 text/plain with Contact, Expires and Canonical (RFC 9116)', async () => {
        const response = getSecurityTxt()
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe(
            'text/plain; charset=utf-8',
        )
        const body = await response.text()
        expect(body).toContain(`Contact: ${SECURITY_CONTACT}`)
        expect(body).toContain(`Expires: ${SECURITY_TXT_EXPIRES}`)
        expect(body).toContain(`Canonical: ${SITE}/.well-known/security.txt`)
    })

    // Deliberately date-bound: renew SECURITY_TXT_EXPIRES in
    // src/lib/security-txt.ts when this starts failing.
    it('expires in more than 30 days and less than a year', () => {
        const remaining = Date.parse(SECURITY_TXT_EXPIRES) - Date.now()
        expect(remaining).toBeGreaterThan(30 * DAY)
        expect(remaining).toBeLessThan(366 * DAY)
    })
})
