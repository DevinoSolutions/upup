import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import SupportPage from '@/app/support/page'
import FAQSection from '@/components/FAQSection'
import FeedbackSection from '@/components/FeedbackSection'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { DISCORD_INVITE_URL } from '@/lib/community-links'

// Every Discord link on useupup.com opens the community server through ONE
// permanent invite, DISCORD_INVITE_URL in src/lib/community-links.ts. Until
// 2026-10-08 the site linked Discord only from the home feedback section (in
// the discord.com/invite form) and the JSON-LD; the navbar, the footer,
// /support and the FAQs did not offer it at all.

// The navbar reads the route to pick its docs/marketing surface; outside the
// app router there is none, so the marketing surface renders.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

const LANDING_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
)
const REPO_ROOT = path.resolve(LANDING_ROOT, '..', '..')
const DECLARATION = path.join(LANDING_ROOT, 'src', 'lib', 'community-links.ts')

/** Any Discord invite, in either form Discord hands out. */
const INVITE =
    /https:\/\/(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9-]+/g

function filesUnder(dir: string, extensions: RegExp): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return filesUnder(full, extensions)
        return extensions.test(entry.name) ? [full] : []
    })
}

function invitesIn(file: string): string[] {
    return Array.from(
        readFileSync(file, 'utf8').matchAll(INVITE),
        match =>
            `${path.relative(REPO_ROOT, file).split(path.sep).join('/')}: ${match[0]}`,
    )
}

/** Every rendered `<a>` whose href is the invite. */
function inviteAnchors(markup: string): string[] {
    return Array.from(
        markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g),
        match => match[0],
    ).filter(anchor => anchor.includes(`href="${DISCORD_INVITE_URL}"`))
}

function expectOpensInNewTab(anchor: string | undefined) {
    expect(anchor, 'no Discord anchor rendered').toBeDefined()
    expect(anchor).toContain('target="_blank"')
    expect(anchor).toContain('rel="noopener noreferrer"')
}

describe('the upup Discord invite', () => {
    it('is the permanent discord.gg invite to the upup server', () => {
        expect(DISCORD_INVITE_URL).toBe('https://discord.gg/ny5WUE9ayc')
    })

    it('is typed out in landing source only in community-links.ts', () => {
        const strays = filesUnder(
            path.join(LANDING_ROOT, 'src'),
            /\.(?:[cm]?[jt]sx?)$/,
        )
            .filter(file => file !== DECLARATION)
            .filter(file => !/\.test\.[cm]?[jt]sx?$/.test(file))
            .flatMap(invitesIn)
        expect(strays).toEqual([])
    })

    it('is the only invite the docs content and the README link to', () => {
        const prose = [
            ...filesUnder(path.join(LANDING_ROOT, 'content'), /\.mdx?$/),
            path.join(REPO_ROOT, 'README.md'),
        ]
        const others = prose
            .flatMap(invitesIn)
            .filter(found => !found.endsWith(`: ${DISCORD_INVITE_URL}`))
        expect(others).toEqual([])
    })

    it('the docs FAQ answers "where do I ask" with it, in the page and the FAQPage frontmatter', () => {
        const faq = readFileSync(
            path.join(LANDING_ROOT, 'content', 'docs', 'faq.mdx'),
            'utf8',
        )
        expect(faq).toContain(`[our Discord](${DISCORD_INVITE_URL})`)
        expect(faq).toMatch(/a: .*ask the community on our Discord/)
    })

    it('the navbar carries an icon button labelled "Join our Discord" on desktop', () => {
        const anchor = inviteAnchors(
            renderToStaticMarkup(createElement(Navbar)),
        )[0]
        expectOpensInNewTab(anchor)
        expect(anchor).toContain('aria-label="Join our Discord"')
        expect(anchor).toContain('title="Join our Discord"')
        expect(anchor).toContain('focus-visible:ring-2')
    })

    it('the mobile menu carries a labelled Discord row', () => {
        // The menu renders only once opened, so read it from the source.
        const navbar = readFileSync(
            path.join(LANDING_ROOT, 'src', 'components', 'Navbar.tsx'),
            'utf8',
        )
        const menu = navbar.slice(navbar.indexOf('{navbarOpen && ('))
        expect(menu).toContain('href={DISCORD_INVITE_URL}')
        expect(menu).toContain('Join our Discord')
    })

    it('the footer links it beside GitHub and npm', () => {
        const anchor = inviteAnchors(
            renderToStaticMarkup(createElement(Footer)),
        )[0]
        expectOpensInNewTab(anchor)
        expect(anchor).toContain('aria-label="Join our Discord"')
    })

    it('/support offers it under the support form', () => {
        const markup = renderToStaticMarkup(createElement(SupportPage))
        const anchor = inviteAnchors(markup)[0]
        expectOpensInNewTab(anchor)
        expect(anchor).toContain('Join our Discord')
    })

    it('the FAQ closes by offering it beside contact support', () => {
        const markup = renderToStaticMarkup(createElement(FAQSection))
        const anchor = inviteAnchors(markup)[0]
        expectOpensInNewTab(anchor)
        expect(anchor).toContain('Ask on our Discord')
        // next/link only keeps the trailing slash under the app's
        // trailingSlash config, which a unit render does not load.
        expect(markup).toMatch(/href="\/support\/?"[^>]*>contact support</)
    })

    it('the home feedback section links it', () => {
        const anchor = inviteAnchors(
            renderToStaticMarkup(createElement(FeedbackSection)),
        )[0]
        expectOpensInNewTab(anchor)
        expect(anchor).toContain('Join our Discord')
    })
})
